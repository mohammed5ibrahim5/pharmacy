#Requires -Version 5.1
<#
.SYNOPSIS
    One-click release script for the Dawai pharmacy Flutter app.

.DESCRIPTION
    Automates the full OTA release flow:

      1. Bump dawai_app/pubspec.yaml (patch version + build number increase)
      2. Build the release APK with Flutter
      3. Commit + push the pubspec bump (so the GitHub tag points at it)
      4. Create the GitHub release vX.Y.Z and upload dawai-app.apk
      5. Rewrite version.json (the OTA manifest) and commit + push it
      6. Verify that the raw manifest and the APK download URL are live

    A GitHub token with repo scope is required. Pass it with -Token or set the
    GITHUB_TOKEN environment variable; the token is never written to disk.

    Requires: git, curl.exe, Flutter (unless -SkipBuild) and network access.

.PARAMETER Version
    New version X.Y.Z (build number is bumped automatically), or X.Y.Z+build.
    Default: current patch version + 1.

.PARAMETER Notes
    Release notes for the GitHub release and version.json.
    Default: subjects of commits since the newest tag reachable from HEAD.

.PARAMETER NotesFile
    Read release notes from a UTF-8 file instead.

.PARAMETER Token
    GitHub token (repo scope). Defaults to $env:GITHUB_TOKEN.
    If empty you are prompted interactively.

.PARAMETER FlutterPath
    Path to flutter.bat. Default: C:\flutter\bin\flutter.bat
    Falls back to 'flutter' on PATH.

.PARAMETER SkipBuild
    Reuse the existing app-release.apk instead of building.

.PARAMETER DryRun
    Print the full plan and exit without changing anything.

.PARAMETER Yes
    Skip the confirmation prompt (for unattended runs).

.EXAMPLE
    .\release.ps1 -DryRun
    Preview what would happen. Nothing is changed.

.EXAMPLE
    .\release.ps1 -Notes "Fix cart bug and improve search" -Yes
    Fully unattended release with the given notes.

.EXAMPLE
    .\release.ps1
    Interactive release; notes are taken from git log since the last tag.
#>
[CmdletBinding()]
param(
    [string]$Version,
    [string]$Notes,
    [string]$NotesFile,
    [string]$Token = $env:GITHUB_TOKEN,
    [string]$FlutterPath = 'C:\flutter\bin\flutter.bat',
    [switch]$SkipBuild,
    [switch]$DryRun,
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

function Invoke-Native {
    # Runs a native command, capturing stdout and stderr. Never throws on
    # stderr by itself: EAP is temporarily 'Continue' during the call, which
    # is the safe pattern under Windows PowerShell 5.1.
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$ArgumentList = @(),
        [switch]$AllowFail
    )
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $out = & $FilePath @ArgumentList 2>&1
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prev
    }
    $text = @($out | ForEach-Object { "$_" })
    if (-not $AllowFail -and $code -ne 0) {
        throw ("Command failed (exit {0}): {1} {2}`n{3}" -f $code, $FilePath, ($ArgumentList -join ' '), ($text -join "`n"))
    }
    [pscustomobject]@{ Output = $text; ExitCode = $code }
}

function Invoke-Git {
    param([string[]]$GitArgs, [switch]$AllowFail, [switch]$Quiet)
    $result = Invoke-Native -FilePath 'git' -ArgumentList (@('-C', $RepoRoot) + $GitArgs) -AllowFail:$AllowFail
    if ($Quiet) { return $result }
    if ($result.Output.Count -gt 0) { Write-Host ($result.Output -join "`n") -ForegroundColor DarkGray }
    return $result
}

function Get-HttpError {
    param($ErrorRecord)
    $code = 0
    $body = "$ErrorRecord"
    $resp = $null
    if ($ErrorRecord.Exception) {
        $prop = $ErrorRecord.Exception.PSObject.Properties['Response']
        if ($prop) { $resp = $prop.Value }
    }
    if ($resp) {
        try { $code = [int]$resp.StatusCode } catch { }
        try {
            $stream = $resp.GetResponseStream()
            if ($stream) {
                $stream.Position = 0
                $reader = New-Object System.IO.StreamReader($stream)
                $body = $reader.ReadToEnd()
                $reader.Close()
            }
        } catch { }
    }
    [pscustomobject]@{ Code = $code; Body = $body }
}

function Format-ApiFailure {
    param($Action, $Info)
    $code = 0
    $body = ''
    if ($Info) { $code = $Info.Code; $body = "$($Info.Body)" }
    if ($body.Length -gt 400) { $body = $body.Substring(0, 400) }
    ("GitHub API failed while trying to {0} (HTTP {1}): {2}" -f $Action, $code, $body)
}

function Invoke-GhApi {
    param([string]$Method = 'GET', [string]$Uri, $Body = $null, [string]$Token)
    $result = Invoke-GhApiTry -Method $Method -Uri $Uri -Body $Body -Token $Token
    if ($null -eq $result) { throw (Format-ApiFailure "$Method $Uri" $script:LastHttpError) }
    return $result
}

$script:LastHttpError = $null

function Invoke-GhApiTry {
    # Returns the parsed response, or $null on failure with $script:LastHttpError set.
    param([string]$Method = 'GET', [string]$Uri, $Body = $null, [string]$Token)
    $script:LastHttpError = $null
    $headers = @{
        'User-Agent' = 'dawai-release-script'
        'Accept'     = 'application/vnd.github+json'
    }
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    $params = @{ Method = $Method; Uri = $Uri; Headers = $headers }
    if ($null -ne $Body) {
        $params['Body'] = [string]($Body | ConvertTo-Json -Depth 6)
        $params['ContentType'] = 'application/json'
    }
    try {
        return Invoke-RestMethod @params
    } catch {
        $script:LastHttpError = Get-HttpError $_
        return $null
    }
}

function Send-ApkAsset {
    # Uploads the APK to a release with curl (reliable for a 60 MB binary).
    param([int]$ReleaseId, [string]$ApkPath, [string]$Token)
    $uploadUrl = "https://uploads.github.com/repos/$Owner/$Repo/releases/$ReleaseId/assets?name=dawai-app.apk"
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ('gh-upload-' + [guid]::NewGuid().ToString('N') + '.json')
    $curlArgs = @(
        '-sS', '-X', 'POST',
        '-H', "Authorization: Bearer $Token",
        '-H', 'Content-Type: application/vnd.android.package-archive',
        '-H', 'Accept: application/vnd.github+json',
        '--data-binary', ('@' + $ApkPath),
        '-o', $tmp,
        '-w', '%{http_code}',
        $uploadUrl
    )
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $attempts = 3
        $code = '000'
        for ($i = 1; $i -le $attempts; $i++) {
            $out = & curl.exe @curlArgs
            $code = "$out".Trim()
            if ($code -eq '201') {
                $body = ''
                if (Test-Path -LiteralPath $tmp) { $body = [IO.File]::ReadAllText($tmp) }
                return $body
            }
            if ($i -lt $attempts) {
                Write-Host ("  upload attempt {0}/{1} returned HTTP {2}, retrying..." -f $i, $attempts, $code) -ForegroundColor Yellow
                Start-Sleep -Seconds 5
            }
        }
        $errBody = ''
        if (Test-Path -LiteralPath $tmp) { $errBody = [IO.File]::ReadAllText($tmp) }
        if ($errBody.Length -gt 400) { $errBody = $errBody.Substring(0, 400) }
        throw ("APK upload failed after {0} attempts (HTTP {1}): {2}" -f $attempts, $code, $errBody)
    } finally {
        $ErrorActionPreference = $prev
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
}

function ConvertTo-JsonText {
    # Escapes a string for use inside a JSON string literal.
    param([string]$Text)
    if ($null -eq $Text) { return '' }
    $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $Text.ToCharArray()) {
        $code = [int]$ch
        if ($ch -eq '\') { [void]$sb.Append('\\') }
        elseif ($ch -eq '"') { [void]$sb.Append('\"') }
        elseif ($code -eq 13) { [void]$sb.Append('\r') }
        elseif ($code -eq 10) { [void]$sb.Append('\n') }
        elseif ($code -eq 9) { [void]$sb.Append('\t') }
        elseif ($code -lt 32) { [void]$sb.Append(('\u{0:x4}' -f $code)) }
        else { [void]$sb.Append($ch) }
    }
    $sb.ToString()
}

function Invoke-Flutter {
    # Runs flutter from the app directory with live output.
    param([string[]]$Arguments)
    if (-not (Test-Path -LiteralPath $FlutterPath)) { throw "Flutter not found: $FlutterPath" }
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    Push-Location -LiteralPath $AppDir
    try {
        & $FlutterPath @Arguments
        $code = $LASTEXITCODE
    } finally {
        Pop-Location
        $ErrorActionPreference = $prev
    }
    if ($code -ne 0) { throw ("flutter {0} failed (exit code {1})" -f ($Arguments -join ' '), $code) }
}

function Test-LiveRelease {
    # Polls the raw manifest and the APK HEAD endpoint until both are live.
    param([string]$ExpectedVersion, [string]$ApkUrl, [long]$ApkSize)
    $res = [pscustomobject]@{ ManifestOk = $false; RemoteVersion = ''; ApkOk = $false; ApkLength = [long]0 }
    $manifestUrl = "https://raw.githubusercontent.com/$Owner/$Repo/master/version.json"
    for ($i = 1; $i -le 8; $i++) {
        try {
            $resp = Invoke-WebRequest -Uri $manifestUrl -UseBasicParsing -TimeoutSec 30 -Headers @{ 'User-Agent' = 'dawai-release-script' }
            $remote = ([regex]'"latest_version"\s*:\s*"([^"]+)"').Match([string]$resp.Content).Groups[1].Value
            $res.RemoteVersion = $remote
            if ($remote -eq $ExpectedVersion) {
                $res.ManifestOk = $true
                $hdr = [IO.Path]::GetTempFileName()
                $prev = $ErrorActionPreference
                $ErrorActionPreference = 'Continue'
                try {
                    $w = & curl.exe -sS -L -I -o $hdr -w '%{http_code}' $ApkUrl
                    $httpCode = "$w".Trim()
                } finally {
                    $ErrorActionPreference = $prev
                }
                $len = [long]0
                if (Test-Path -LiteralPath $hdr) {
                    $cl = Get-Content -LiteralPath $hdr | Where-Object { $_ -match '^Content-Length:\s*\d+' } | Select-Object -Last 1
                    if ($cl -and $cl -match '^Content-Length:\s*(\d+)') { $len = [long]$Matches[1] }
                    Remove-Item -LiteralPath $hdr -Force -ErrorAction SilentlyContinue
                }
                $res.ApkLength = $len
                if ($httpCode -eq '200' -and ($len -eq $ApkSize -or $len -eq 0)) {
                    $res.ApkOk = $true
                    break
                }
            }
        } catch { }
        Write-Host ("  waiting for CDN propagation ({0}/8)..." -f $i) -ForegroundColor DarkGray
        Start-Sleep -Seconds 5
    }
    $res
}

function Undo-LocalChange {
    # Restores a file only if it still differs from HEAD (i.e. was never committed).
    param([string]$RelPath)
    $st = Invoke-Git -GitArgs @('status', '--porcelain', '--', $RelPath) -Quiet -AllowFail
    if (@($st.Output).Count -gt 0) {
        Invoke-Git -GitArgs @('checkout', '--', $RelPath) -Quiet -AllowFail | Out-Null
        Write-Host ("  rolled back local change: {0}" -f $RelPath) -ForegroundColor Yellow
    }
}

function Write-Step {
    param([string]$Text)
    Write-Host ''
    Write-Host ('== ' + $Text) -ForegroundColor Cyan
}

# --------------------------------------------------------------------------
# Precondition checks
# --------------------------------------------------------------------------

$RepoRoot = $PSScriptRoot
if (-not $RepoRoot) { $RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path }

$AppDir         = Join-Path $RepoRoot 'dawai_app'
$pubspecPath    = Join-Path $AppDir 'pubspec.yaml'
$versionJsonPath = Join-Path $RepoRoot 'version.json'
$apkPath        = Join-Path $AppDir 'build\app\outputs\flutter-apk\app-release.apk'

$RollbackPubspec    = $false
$RollbackVersionJson = $false

foreach ($required in @($pubspecPath, $versionJsonPath)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Missing required file: $required (the script must live at the repository root)"
    }
}
if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.git'))) {
    throw "Not a git repository: $RepoRoot"
}

# ---- release signing -----------------------------------------------------
# An APK signed with the debug keystore can be re-signed by anyone (the debug
# password is public knowledge) and Play rejects it outright, so a release
# must never leave this machine without the real keystore.
$keystorePropsPath = Join-Path $AppDir 'android\key.properties'
$keystorePath      = Join-Path $AppDir 'android\app\upload-keystore.jks'
if (-not (Test-Path -LiteralPath $keystorePropsPath)) {
    $msg = @(
        "Missing $keystorePropsPath."
        'Generate a release keystore first, e.g.'
        '  keytool -genkeypair -v -keystore android/app/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload -storepass <pass> -keypass <pass> -dname "CN=Dawai,O=Dawai,L=Cairo,C=EG"'
        'then create android/key.properties with storeFile, storePassword, keyAlias and keyPassword.'
    ) -join [Environment]::NewLine
    throw $msg
}
if (-not (Test-Path -LiteralPath $keystorePath)) {
    throw "android/key.properties exists but the keystore it points at is missing: $keystorePath"
}
foreach ($secretPath in @('dawai_app/android/key.properties', 'dawai_app/android/app/upload-keystore.jks')) {
    $tracked = @((Invoke-Git -GitArgs @('ls-files', '--', $secretPath) -Quiet -AllowFail).Output)
    if ($tracked.Count -gt 0) {
        throw "$secretPath is tracked by git - it must be ignored. Run: git rm --cached '$secretPath'"
    }
}

$branch = (Invoke-Git -GitArgs @('rev-parse', '--abbrev-ref', 'HEAD') -Quiet).Output[0]
if ($branch -ne 'master') {
    throw "This script must run on branch 'master' (current: $branch). The OTA manifest URL is pinned to /master/."
}

$originUrl = (Invoke-Git -GitArgs @('remote', 'get-url', 'origin') -Quiet).Output[0]
if ($originUrl -match 'github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?$') {
    $Owner = $Matches[1]
    $Repo = $Matches[2]
} else {
    throw "origin is not a GitHub remote: $originUrl"
}
$ApiBase = "https://api.github.com/repos/$Owner/$Repo"

# ---- current and new version -------------------------------------------

$pubspecText = [IO.File]::ReadAllText($pubspecPath)
$verMatches = [regex]::Matches($pubspecText, '(?m)^version:\s*(\d+)\.(\d+)\.(\d+)\+(\d+)')
if ($verMatches.Count -eq 0) { throw "No 'version: X.Y.Z+B' line found in $pubspecPath" }
if ($verMatches.Count -gt 1) { throw "Multiple version lines found in $pubspecPath" }

$m = $verMatches[0].Groups
$curBase  = '{0}.{1}.{2}' -f $m[1].Value, $m[2].Value, $m[3].Value
$curBuild = [int]$m[4].Value
$curVer   = '{0}+{1}' -f $curBase, $curBuild

if ($Version) {
    $vm = [regex]::Match($Version, '^(\d+)\.(\d+)\.(\d+)(?:\+(\d+))?$')
    if (-not $vm.Success) { throw "Invalid -Version '$Version'. Use X.Y.Z or X.Y.Z+build." }
    $newBase = '{0}.{1}.{2}' -f $vm.Groups[1].Value, $vm.Groups[2].Value, $vm.Groups[3].Value
    if ($vm.Groups[4].Success) { $newBuild = [int]$vm.Groups[4].Value } else { $newBuild = $curBuild + 1 }
} else {
    $newBase = '{0}.{1}.{2}' -f [int]$m[1].Value, [int]$m[2].Value, ([int]$m[3].Value + 1)
    $newBuild = $curBuild + 1
}
if ([version]$newBase -lt [version]$curBase) { throw "Version would go backwards: $curBase -> $newBase" }
if ($newBase -eq $curBase -and $newBuild -le $curBuild) {
    throw "Build number must increase: current $curVer, requested ${newBase}+${newBuild}"
}
$newVer  = '{0}+{1}' -f $newBase, $newBuild
$tagName = "v$newBase"

# ---- release notes ------------------------------------------------------

if ($NotesFile) {
    if (-not (Test-Path -LiteralPath $NotesFile)) { throw "Notes file not found: $NotesFile" }
    $notes = [IO.File]::ReadAllText($NotesFile)
    $notes = $notes -replace "(`r`n|`n)+$", ''
} elseif ($Notes) {
    $notes = $Notes
} else {
    Invoke-Git -GitArgs @('fetch', '--tags', '--quiet') -Quiet -AllowFail | Out-Null
    $tagList = @((Invoke-Git -GitArgs @('tag', '--list', '--sort=-v:refname') -Quiet).Output | Where-Object { $_ })
    # Prefer the newest tag that is actually reachable from HEAD (tags from
    # rewritten/abandoned history are skipped).
    $lastTag = $null
    foreach ($t in $tagList) {
        $anc = Invoke-Git -GitArgs @('merge-base', '--is-ancestor', $t, 'HEAD') -Quiet -AllowFail
        if ($anc.ExitCode -eq 0) { $lastTag = $t; break }
    }
    $subjects = @()
    if ($lastTag) {
        $subjects = @((Invoke-Git -GitArgs @('log', ('{0}..HEAD' -f $lastTag), '--pretty=tformat:%s') -Quiet).Output | Where-Object { $_ })
    } else {
        # No tag is reachable from HEAD (existing tags may point at rewritten
        # history): fall back to the most recent version-bump commit.
        $logLines = @((Invoke-Git -GitArgs @('log', 'HEAD', '--pretty=tformat:%H %s') -Quiet).Output)
        $boundary = $null
        foreach ($l in $logLines) {
            if ($l -match '^[0-9a-f]+\s+chore: bump version to \d+\.\d+\.\d+') {
                $boundary = ($l -split '\s+')[0]
                break
            }
        }
        if ($boundary) {
            $subjects = @((Invoke-Git -GitArgs @('log', ('{0}..HEAD' -f $boundary), '--pretty=tformat:%s') -Quiet).Output | Where-Object { $_ })
        }
    }
    if ($subjects.Count -gt 0) { $notes = ($subjects -join "`n") } else { $notes = '- Bug fixes and improvements.' }
}

# ---- working tree warnings ---------------------------------------------

$statusLines = @((Invoke-Git -GitArgs @('status', '--porcelain') -Quiet).Output)
$dirtyLines = @()
foreach ($line in $statusLines) {
    if ($line.Length -lt 4) { continue }
    $path = $line.Substring(3)
    if ($path -match '^(dawai_app[/\\]pubspec\.yaml|version\.json|release\.(ps1|cmd))$') { continue }
    $dirtyLines += $line
}
$warnings = @()
if ($dirtyLines.Count -gt 0) {
    $warnings += 'Working tree is not clean (these files are NOT touched by this script):'
    foreach ($d in $dirtyLines) { $warnings += ('    ' + $d) }
}

$apkExists = Test-Path -LiteralPath $apkPath
$apkSize = [long]0
if ($apkExists) { $apkSize = (Get-Item -LiteralPath $apkPath).Length }
if ($SkipBuild -and -not $apkExists) { throw "-SkipBuild set but APK not found: $apkPath" }

$apkUrl    = "https://github.com/$Owner/$Repo/releases/download/$tagName/dawai-app.apk"
$manifestUrl = "https://raw.githubusercontent.com/$Owner/$Repo/master/version.json"

# --------------------------------------------------------------------------
# Plan
# --------------------------------------------------------------------------

Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkCyan
Write-Host ' Dawai release plan' -ForegroundColor White
Write-Host '============================================================' -ForegroundColor DarkCyan
Write-Host ('  Repo:          {0}/{1}  (branch {2})' -f $Owner, $Repo, $branch)
Write-Host ('  Version:       {0}  ->  {1}' -f $curVer, $newVer) -ForegroundColor White
Write-Host ('  Tag/release:   {0}' -f $tagName)
Write-Host ('  Flutter:       {0}' -f $(if ($SkipBuild) { "$FlutterPath (SKIP - reuse existing APK)" } else { $FlutterPath }))
if ($apkExists) {
    Write-Host ('  APK on disk:   {0}  ({1:N1} MB)' -f $apkPath, ($apkSize / 1MB))
} else {
    Write-Host '  APK on disk:   none yet (will be built)'
}
Write-Host ('  Release page:  {0}/releases/tag/{1}' -f "https://github.com/$Owner/$Repo", $tagName)
Write-Host ('  Manifest URL:  {0}' -f $manifestUrl)
Write-Host '  Release notes:'
foreach ($l in (($notes -split "`r?`n"))) {
    $shown = $l
    if ($shown.Length -gt 100) { $shown = $shown.Substring(0, 100) + ' ...' }
    Write-Host ('    ' + $shown)
}
if ($warnings.Count -gt 0) {
    Write-Host ''
    foreach ($w in $warnings) { Write-Host ('  WARNING: ' + $w) -ForegroundColor Yellow }
}
Write-Host '============================================================' -ForegroundColor DarkCyan

if ($DryRun) {
    Write-Host 'Dry run complete - nothing was changed.' -ForegroundColor Green
    exit 0
}

if (-not $Yes) {
    $answer = Read-Host 'Proceed with this release? [y/N]'
    if ($answer.Trim() -notmatch '^(?i)(y|yes)$') {
        Write-Host 'Aborted - nothing was changed.' -ForegroundColor Yellow
        exit 0
    }
}

if ([string]::IsNullOrWhiteSpace($Token)) {
    $Token = (Read-Host 'GitHub token (repo scope, not stored)').Trim()
}
if ([string]::IsNullOrWhiteSpace($Token)) { throw 'No GitHub token provided (use -Token or $env:GITHUB_TOKEN).' }

$repoInfo = Invoke-GhApi -Method GET -Uri $ApiBase -Token $Token
Write-Host ("  authenticated as token; repo visible: {0}/{1}" -f $repoInfo.owner.login, $repoInfo.name)

# --------------------------------------------------------------------------
# 1. Bump pubspec.yaml
# --------------------------------------------------------------------------

Write-Step ('[1/6] Bumping version {0} -> {1}' -f $curVer, $newVer)
$bytes = [IO.File]::ReadAllBytes($pubspecPath)
$hadBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
$pubspecClean = (@((Invoke-Git -GitArgs @('status', '--porcelain', '--', 'dawai_app/pubspec.yaml') -Quiet).Output).Count -eq 0)

$rx = New-Object System.Text.RegularExpressions.Regex('(?m)^version:\s*\d+\.\d+\.\d+\+\d+')
$newPubspec = $rx.Replace($pubspecText, ('version: {0}' -f $newVer), 1)
if ($newPubspec -eq $pubspecText) { throw 'pubspec version line was not replaced' }
[IO.File]::WriteAllText($pubspecPath, $newPubspec, (New-Object System.Text.UTF8Encoding($hadBom)))
if ($pubspecClean) { $RollbackPubspec = $true }
Write-Host ("  wrote dawai_app/pubspec.yaml: version: {0}" -f $newVer)

# --------------------------------------------------------------------------
# 2. Build APK
# --------------------------------------------------------------------------

if ($SkipBuild) {
    Write-Step '[2/6] Building APK (SKIPPED - reusing existing APK)'
} else {
    Write-Step '[2/6] Building release APK (takes a few minutes)'
    if (-not (Test-Path -LiteralPath $FlutterPath)) {
        $onPath = Get-Command flutter -ErrorAction SilentlyContinue
        if ($onPath) { $FlutterPath = $onPath.Source } else { throw "Flutter not found at '$FlutterPath' and not on PATH (use -FlutterPath or -SkipBuild)." }
    }
    Invoke-Flutter -Arguments @('build', 'apk', '--release')
    if (-not (Test-Path -LiteralPath $apkPath)) { throw "Build finished but APK not found: $apkPath" }
}
$apkSize = (Get-Item -LiteralPath $apkPath).Length
Write-Host ("  APK ready: {0}  ({1:N1} MB)" -f $apkPath, ($apkSize / 1MB))

# --------------------------------------------------------------------------
# 3. Commit + push the pubspec bump (so the tag points at it)
# --------------------------------------------------------------------------

Write-Step '[3/6] Committing and pushing the version bump'
Invoke-Git -GitArgs @('add', '--', 'dawai_app/pubspec.yaml') | Out-Null
Invoke-Git -GitArgs @('commit', '-m', ('chore: bump version to {0}' -f $newVer), '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>', '--', 'dawai_app/pubspec.yaml')
Invoke-Git -GitArgs @('push', 'origin', 'master')
$RollbackPubspec = $false

# --------------------------------------------------------------------------
# 4. Create release + upload APK
# --------------------------------------------------------------------------

Write-Step ('[4/6] Creating GitHub release {0} and uploading the APK' -f $tagName)
$releaseBody = @{
    tag_name         = $tagName
    target_commitish = 'master'
    name             = $tagName
    body             = $notes
    draft            = $false
    prerelease       = $false
}
$release = Invoke-GhApiTry -Method POST -Uri ("$ApiBase/releases") -Body $releaseBody -Token $Token
if ($null -eq $release) {
    if ($script:LastHttpError -and $script:LastHttpError.Code -eq 422) {
        Write-Host ('  release {0} already exists - reusing it' -f $tagName) -ForegroundColor Yellow
        $release = Invoke-GhApi -Method GET -Uri ("$ApiBase/releases/tags/$tagName") -Token $Token
    } else {
        throw (Format-ApiFailure 'create release' $script:LastHttpError)
    }
}
$stale = @($release.assets | Where-Object { $_ -and $_.name -eq 'dawai-app.apk' })
foreach ($a in $stale) {
    Write-Host '  removing the existing dawai-app.apk asset from the release...' -ForegroundColor Yellow
    $del = Invoke-GhApiTry -Method DELETE -Uri $a.url -Token $Token
    if ($script:LastHttpError) { throw (Format-ApiFailure 'delete stale APK asset' $script:LastHttpError) }
}
Write-Host '  uploading dawai-app.apk (60 MB, this can take a minute)...'
$uploadResult = Send-ApkAsset -ReleaseId ([int]$release.id) -ApkPath $apkPath -Token $Token
Write-Host '  upload complete (HTTP 201)'

# --------------------------------------------------------------------------
# 5. Update version.json
# --------------------------------------------------------------------------

Write-Step ('[5/6] Updating version.json (OTA manifest) to {0}' -f $newBase)
$vjBytes = [IO.File]::ReadAllBytes($versionJsonPath)
$vjHadBom = ($vjBytes.Length -ge 3 -and $vjBytes[0] -eq 0xEF -and $vjBytes[1] -eq 0xBB -and $vjBytes[2] -eq 0xBF)
$vjOld = [IO.File]::ReadAllText($versionJsonPath)
$vjClean = (@((Invoke-Git -GitArgs @('status', '--porcelain', '--', 'version.json') -Quiet).Output).Count -eq 0)
$nl = "`n"
if ($vjOld.Contains("`r`n")) { $nl = "`r`n" }

$notesJson = ConvertTo-JsonText -Text $notes
$vjNew = '{' + $nl +
    '  "latest_version": "' + $newBase + '",' + $nl +
    '  "download_url": "' + $apkUrl + '",' + $nl +
    '  "release_notes": "' + $notesJson + '"' + $nl +
    '}'
$null = $vjNew | ConvertFrom-Json   # sanity check before writing
[IO.File]::WriteAllText($versionJsonPath, $vjNew, (New-Object System.Text.UTF8Encoding($vjHadBom)))
if ($vjClean) { $RollbackVersionJson = $true }
Write-Host ("  wrote version.json: latest_version={0}" -f $newBase)

Invoke-Git -GitArgs @('add', '--', 'version.json') | Out-Null
Invoke-Git -GitArgs @('commit', '-m', ('chore: update version.json for {0}' -f $tagName), '-m', 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>', '--', 'version.json')
Invoke-Git -GitArgs @('push', 'origin', 'master')
$RollbackVersionJson = $false

# --------------------------------------------------------------------------
# 6. Verify
# --------------------------------------------------------------------------

Write-Step '[6/6] Verifying that the release is live'
$live = Test-LiveRelease -ExpectedVersion $newBase -ApkUrl $apkUrl -ApkSize $apkSize

Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkCyan
Write-Host ('  Release complete: {0}   (version {1})' -f $tagName, $newVer) -ForegroundColor Green
Write-Host ('  Release page: {0}/releases/tag/{1}' -f "https://github.com/$Owner/$Repo", $tagName)
Write-Host ('  APK:          {0}' -f $apkUrl)
Write-Host ('  Manifest:     {0}' -f $manifestUrl)
if ($live.ManifestOk -and $live.ApkOk) {
    Write-Host ('  Verified:     latest_version={0}, APK HTTP 200 ({1:N1} MB)' -f $live.RemoteVersion, ($live.ApkLength / 1MB)) -ForegroundColor Green
} else {
    if (-not $live.ManifestOk) {
        Write-Host ('  WARNING: manifest not live yet (raw shows {0}, expected {1}). CDN can take a few minutes - re-check: {2}' -f $live.RemoteVersion, $newBase, $manifestUrl) -ForegroundColor Yellow
    }
    if (-not $live.ApkOk) {
        Write-Host ('  WARNING: APK HEAD check not confirmed yet (length {0}, expected {1}).' -f $live.ApkLength, $apkSize) -ForegroundColor Yellow
    }
}
Write-Host '  Users on older versions get the update prompt on next launch.' -ForegroundColor DarkGray
Write-Host '============================================================' -ForegroundColor DarkCyan
exit 0
