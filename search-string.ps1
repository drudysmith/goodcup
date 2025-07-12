# Usage: .\Find-FirstMatch.ps1 "search text"

param (
    [Parameter(Mandatory = $true)]
    [string]$SearchString
)

# === Hard-coded folders to exclude ===
$excludedDirs = @(
    "node_modules",
    "bin",
    "obj",
    ".git",
    ".next"
)

# === Initial confirmation message ===
Write-Host "Indexing directory structure. Please wait a few seconds..."

# Normalize excluded paths silently
$excludedPaths = $excludedDirs | ForEach-Object {
    try {
        (Resolve-Path $_ 2>$null).Path
    } catch {
        $null
    }
} | Where-Object { $_ -ne $null }

# Get all files not in excluded directories
$files = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue 2>$null | Where-Object {
    $filePath = $_.FullName
    -not ($excludedPaths | Where-Object { $filePath -like "$_*" })
}

$total = $files.Count
$current = 0

function Show-ProgressBar {
    param (
        [int]$Current,
        [int]$Total,
        [int]$BarWidth = 40
    )
    $percent = if ($Total -eq 0) { 100 } else { [math]::Round(($Current / $Total) * 100) }
    $filled = [math]::Floor(($percent / 100) * $BarWidth)
    $empty = $BarWidth - $filled
    $bar = ('#' * $filled) + ('-' * $empty)
    Write-Host -NoNewline "`r[$bar] $percent% ($Current/$Total)"
}

foreach ($file in $files) {
    $current++
    Show-ProgressBar -Current $current -Total $total

    try {
        $lines = Get-Content -Path $file.FullName -ErrorAction Stop 2>$null
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match $SearchString) {
                Write-Host "`n$($file.FullName) : Line $($i + 1)"
                break
            }
        }
    } catch {
        # quietly skip unreadable files
    }
}

Write-Host "`nDone."