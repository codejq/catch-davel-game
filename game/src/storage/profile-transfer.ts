import { invoke, isTauri } from '@tauri-apps/api/core';
import { parseProfile, validateProfile, type ProfileV9 } from './profile';

export const PROFILE_TRANSFER_MAX_BYTES = 4 * 1024 * 1024;
export const PROFILE_EXPORT_FILENAME = 'catch-davel-profile-v9.json';

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function serializeProfileExport(profileValue: ProfileV9): string {
  const profile = validateProfile(profileValue);
  const serialized = `${JSON.stringify(profile, null, 2)}\n`;
  if (byteLength(serialized) > PROFILE_TRANSFER_MAX_BYTES) throw new Error('Profile export exceeds the 4 MiB safety limit');
  return serialized;
}

export function parseProfileExport(serialized: string): ProfileV9 {
  const length = byteLength(serialized);
  if (length === 0 || length > PROFILE_TRANSFER_MAX_BYTES) throw new Error('Profile import must contain 1 byte through 4 MiB');
  const profile = parseProfile(serialized);
  if (profile.profileId !== 'default') throw new Error('Only the default Catch Davel profile can be imported in this build');
  return profile;
}

function downloadBrowserProfile(serialized: string): void {
  const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = PROFILE_EXPORT_FILENAME;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function pickBrowserProfile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.hidden = true;
    document.body.append(input);
    let settled = false;
    const finish = (value: string | null): void => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };
    input.addEventListener('cancel', () => finish(null), { once: true });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file === undefined) { finish(null); return; }
      if (file.size === 0 || file.size > PROFILE_TRANSFER_MAX_BYTES) {
        input.remove(); settled = true; reject(new Error('Profile import must contain 1 byte through 4 MiB')); return;
      }
      file.text().then(finish).catch((error: unknown) => { input.remove(); settled = true; reject(error); });
    }, { once: true });
    input.click();
  });
}

export async function exportProfileFile(profile: ProfileV9): Promise<boolean> {
  const serializedProfile = serializeProfileExport(profile);
  if (isTauri()) return invoke<boolean>('export_packaged_profile', { serializedProfile });
  downloadBrowserProfile(serializedProfile);
  return true;
}

export async function importProfileFile(): Promise<ProfileV9 | null> {
  const serialized = isTauri()
    ? await invoke<string | null>('import_packaged_profile')
    : await pickBrowserProfile();
  return serialized === null ? null : parseProfileExport(serialized);
}
