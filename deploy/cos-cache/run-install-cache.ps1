param(
    [Parameter(Mandatory = $true)][string]$Server,
    [Parameter(Mandatory = $true)][string]$KnownHost,
    [int]$Port = 22222,
    [string]$ReportName = 'taozhiyy-cos-cache-install'
)
$ErrorActionPreference = 'Stop'
$downloads = Join-Path $env:USERPROFILE 'Downloads'
$outputPath = Join-Path $downloads "$ReportName.json"
$statusPath = Join-Path $downloads "$ReportName.status.txt"
try {
    Write-Host 'Install public original-image cache after backing up Nginx configuration.'
    Write-Host 'No COS object, image quality, URL, SSH policy or production .env will be changed.'
    Write-Host 'Enter your Ubuntu server password when prompted. It will not be saved.'
    $source = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'install_cache.py'))
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($source))
    $command = "printf %s $encoded | base64 -d | sudo -n /usr/bin/python3 -B"
    $sshArgs = @('-T','-p',"$Port",'-o','StrictHostKeyChecking=yes','-o',"HostKeyAlias=$KnownHost",'-o','UpdateHostKeys=no','-o','IdentitiesOnly=yes','-o','ControlMaster=no','-o','ControlPath=none','-o','ConnectTimeout=15','-i',(Join-Path $env:USERPROFILE '.ssh\taozhiyy_deploy'),"ubuntu@$Server",$command)
    $raw = & ssh @sshArgs
    if ($LASTEXITCODE -ne 0) { throw "Cache installation failed: SSH exit $LASTEXITCODE. Check the error above; the installer rolls configuration back on verification failure." }
    $text = $raw -join "`n"
    $result = $text | ConvertFrom-Json
    if (-not $result.installed -or -not $result.checks.original_bytes_unchanged) { throw 'Unexpected installation output' }
    [IO.File]::WriteAllText($outputPath, $text, [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText($statusPath, 'SUCCESS', [Text.UTF8Encoding]::new($false))
    Write-Host "Verified. Result saved to $outputPath"
} catch {
    [IO.File]::WriteAllText($statusPath, ('FAILED: ' + $_.Exception.Message), [Text.UTF8Encoding]::new($false))
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}
