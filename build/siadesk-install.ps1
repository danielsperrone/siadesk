param(
    [switch]$FindInstallation,
    [switch]$CheckRunning,
    [string]$InstallDirectory,
    [string[]]$ShortcutPaths
)

$ErrorActionPreference = 'Stop'

if ($FindInstallation) {
    if (-not $ShortcutPaths) {
        $ShortcutPaths = @(
            (Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'SIADESK.lnk'),
            (Join-Path ([Environment]::GetFolderPath('Programs')) 'SIADESK.lnk'),
            (Join-Path ([Environment]::GetFolderPath('CommonDesktopDirectory')) 'SIADESK.lnk'),
            (Join-Path ([Environment]::GetFolderPath('CommonPrograms')) 'SIADESK.lnk')
        )
    }
    $shell = New-Object -ComObject WScript.Shell
    foreach ($shortcutPath in $ShortcutPaths) {
        if (-not (Test-Path -LiteralPath $shortcutPath -PathType Leaf)) { continue }
        $target = $shell.CreateShortcut($shortcutPath).TargetPath
        if ([IO.Path]::GetFileName($target) -ine 'SIADESK.exe') { continue }
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { continue }
        $directory = Split-Path -LiteralPath $target
        if ((Get-Item -LiteralPath $target).VersionInfo.ProductName -ne 'SIADESK') { continue }
        if (-not (Test-Path -LiteralPath (Join-Path $directory 'resources\app.asar') -PathType Leaf)) { continue }
        # Sem quebra de linha: o NSIS usa a saída como pasta de destino.
        [Console]::Out.Write($directory)
        exit 0
    }
    exit 0
}

if ($CheckRunning) {
    if (-not $InstallDirectory) { exit 2 }
    $executable = [IO.Path]::GetFullPath((Join-Path $InstallDirectory 'SIADESK.exe'))
    $running = @(Get-CimInstance Win32_Process -Filter "Name = 'SIADESK.exe'" |
        Where-Object { $_.ExecutablePath -and $_.ExecutablePath -ieq $executable })
    if ($running.Count -gt 0) { exit 2 }
    exit 0
}

exit 2
