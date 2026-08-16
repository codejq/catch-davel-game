use serde::Serialize;
use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::Manager;

const MAX_PROFILE_BYTES: usize = 4 * 1024 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProfileCandidates {
    current: Option<String>,
    previous: Option<String>,
}

fn profile_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("profiles").join("default"))
        .map_err(|error| format!("Unable to resolve app-data profile directory: {error}"))
}

fn read_bounded(path: &Path) -> Result<Option<String>, String> {
    let mut file = match File::open(path) {
        Ok(file) => file,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("Unable to open packaged profile: {error}")),
    };
    let length = file
        .metadata()
        .map_err(|error| format!("Unable to inspect packaged profile: {error}"))?
        .len() as usize;
    if length > MAX_PROFILE_BYTES {
        return Err("Packaged profile exceeds the 4 MiB safety limit".to_string());
    }
    let mut serialized = String::with_capacity(length);
    file.read_to_string(&mut serialized)
        .map_err(|error| format!("Packaged profile is not valid UTF-8 text: {error}"))?;
    Ok(Some(serialized))
}

fn load_candidates_from(directory: &Path) -> Result<ProfileCandidates, String> {
    Ok(ProfileCandidates {
        current: read_bounded(&directory.join("profile.json"))?,
        previous: read_bounded(&directory.join("profile.previous.json"))?,
    })
}

fn sync_directory(directory: &Path) -> Result<(), String> {
    #[cfg(unix)]
    File::open(directory)
        .and_then(|file| file.sync_all())
        .map_err(|error| format!("Unable to synchronize packaged profile directory: {error}"))?;
    #[cfg(not(unix))]
    let _ = directory;
    Ok(())
}

fn store_profile_in(directory: &Path, serialized_profile: &str) -> Result<(), String> {
    if serialized_profile.is_empty() || serialized_profile.len() > MAX_PROFILE_BYTES {
        return Err("Packaged profile must contain 1 byte through 4 MiB".to_string());
    }
    serde_json::from_str::<serde_json::Value>(serialized_profile)
        .map_err(|error| format!("Packaged profile is not JSON: {error}"))?;
    fs::create_dir_all(directory)
        .map_err(|error| format!("Unable to create packaged profile directory: {error}"))?;
    let current = directory.join("profile.json");
    let previous = directory.join("profile.previous.json");
    let temporary = directory.join("profile.pending.json");
    if temporary.exists() {
        fs::remove_file(&temporary)
            .map_err(|error| format!("Unable to clear an interrupted profile write: {error}"))?;
    }
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|error| format!("Unable to create pending packaged profile: {error}"))?;
    file.write_all(serialized_profile.as_bytes())
        .and_then(|_| file.sync_all())
        .map_err(|error| format!("Unable to durably write pending packaged profile: {error}"))?;
    drop(file);

    if previous.exists() {
        fs::remove_file(&previous)
            .map_err(|error| format!("Unable to retire previous packaged profile: {error}"))?;
    }
    if current.exists() {
        fs::rename(&current, &previous)
            .map_err(|error| format!("Unable to rotate current packaged profile: {error}"))?;
    }
    if let Err(error) = fs::rename(&temporary, &current) {
        if previous.exists() && !current.exists() {
            let _ = fs::rename(&previous, &current);
        }
        return Err(format!(
            "Unable to activate pending packaged profile: {error}"
        ));
    }
    sync_directory(directory)
}

#[tauri::command]
fn load_packaged_profile(app: tauri::AppHandle) -> Result<ProfileCandidates, String> {
    load_candidates_from(&profile_directory(&app)?)
}

#[tauri::command]
fn store_packaged_profile(
    app: tauri::AppHandle,
    write_lock: tauri::State<'_, Mutex<()>>,
    serialized_profile: String,
) -> Result<(), String> {
    let _guard = write_lock
        .lock()
        .map_err(|_| "Packaged profile write lock is poisoned".to_string())?;
    store_profile_in(&profile_directory(&app)?, &serialized_profile)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(()))
        .invoke_handler(tauri::generate_handler![
            load_packaged_profile,
            store_packaged_profile
        ])
        .run(tauri::generate_context!())
        .expect("error while running Quantum Catch Davel");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_directory(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("catch-davel-{name}-{}-{nonce}", std::process::id()))
    }

    #[test]
    fn rotates_current_profile_and_keeps_previous_recovery_copy() {
        let directory = temporary_directory("rotation");
        store_profile_in(&directory, r#"{"revision":1}"#).unwrap();
        store_profile_in(&directory, r#"{"revision":2}"#).unwrap();
        let candidates = load_candidates_from(&directory).unwrap();
        assert_eq!(candidates.current.as_deref(), Some(r#"{"revision":2}"#));
        assert_eq!(candidates.previous.as_deref(), Some(r#"{"revision":1}"#));
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn exposes_previous_copy_when_activation_was_interrupted() {
        let directory = temporary_directory("recovery");
        fs::create_dir_all(&directory).unwrap();
        fs::write(directory.join("profile.previous.json"), r#"{"revision":4}"#).unwrap();
        let candidates = load_candidates_from(&directory).unwrap();
        assert!(candidates.current.is_none());
        assert_eq!(candidates.previous.as_deref(), Some(r#"{"revision":4}"#));
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn rejects_non_json_or_oversized_profile_payloads() {
        let directory = temporary_directory("bounds");
        assert!(
            store_profile_in(&directory, "not json")
                .unwrap_err()
                .contains("not JSON")
        );
        let oversized = "x".repeat(MAX_PROFILE_BYTES + 1);
        assert!(
            store_profile_in(&directory, &oversized)
                .unwrap_err()
                .contains("4 MiB")
        );
        assert!(!directory.exists());
    }
}
