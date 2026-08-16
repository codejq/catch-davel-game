$ErrorActionPreference = 'Stop'

$gameRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tauriRoot = (Resolve-Path (Join-Path $gameRoot 'src-tauri')).Path
$androidRoot = (Resolve-Path (Join-Path $tauriRoot 'gen\android')).Path
$targets = @(
  @{ Tauri = 'aarch64'; Rust = 'aarch64-linux-android'; Abi = 'arm64-v8a'; Variant = 'Arm64' },
  @{ Tauri = 'x86_64'; Rust = 'x86_64-linux-android'; Abi = 'x86_64'; Variant = 'X86_64' }
)

Push-Location $gameRoot
try {
  $requiresWindowsFallback = $false
  foreach ($target in $targets) {
    & npx tauri android build --debug --apk --target $target.Tauri --ci
    if ($LASTEXITCODE -ne 0) {
      if ($env:OS -ne 'Windows_NT') { throw "Tauri Android build failed for $($target.Tauri)" }
      $library = Join-Path $tauriRoot "target\$($target.Rust)\debug\libquantum_catch_davel_lib.so"
      if (-not (Test-Path -LiteralPath $library)) {
        throw "Tauri Android build failed before producing $library"
      }
      $requiresWindowsFallback = $true
    }
  }

  if ($requiresWindowsFallback) {
    foreach ($target in $targets) {
      $library = (Resolve-Path (Join-Path $tauriRoot "target\$($target.Rust)\debug\libquantum_catch_davel_lib.so")).Path
      $jniDirectory = Join-Path $androidRoot "app\src\main\jniLibs\$($target.Abi)"
      if (-not $jniDirectory.StartsWith($androidRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to write outside the generated Android project: $jniDirectory"
      }
      New-Item -ItemType Directory -Force -Path $jniDirectory | Out-Null
      Copy-Item -LiteralPath $library -Destination (Join-Path $jniDirectory 'libquantum_catch_davel_lib.so') -Force
    }
    Push-Location $androidRoot
    try {
      & .\gradlew.bat :app:assembleArm64Debug :app:assembleX86_64Debug `
        -x :app:rustBuildArm64Debug -x :app:rustBuildX86_64Debug --no-daemon
      if ($LASTEXITCODE -ne 0) { throw 'Gradle APK assembly failed after the Windows symlink fallback' }
    } finally {
      Pop-Location
    }
  }
} finally {
  Pop-Location
}

$apks = Get-ChildItem -Recurse (Join-Path $androidRoot 'app\build\outputs\apk') -Filter '*.apk'
if ($apks.Count -lt 2) { throw 'Expected ARM64 and x86_64 debug APKs were not produced' }
$apks | ForEach-Object {
  [pscustomobject]@{
    Path = $_.FullName
    Bytes = $_.Length
    Sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  }
} | Format-Table -AutoSize
