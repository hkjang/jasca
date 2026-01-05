# Trivy DB Download and Management Script
# Usage: .\download-trivy-db.ps1 [-Force] [-UpdateOnly]

param(
    [switch]$Force,        # Force re-download even if DB exists
    [switch]$UpdateOnly    # Only update if newer version available
)

$ErrorActionPreference = "Stop"

# Configuration
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $ProjectRoot "trivy-db"
$TrivyCacheDir = "$env:LOCALAPPDATA\trivy"

function Write-ColorOutput($Color, $Message) {
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "Cyan" "========================================"
Write-ColorOutput "Cyan" "     Trivy DB Download & Sync"
Write-ColorOutput "Cyan" "========================================"
Write-Host ""

# Check if Trivy is installed
$trivyPath = Get-Command trivy -ErrorAction SilentlyContinue
if (-not $trivyPath) {
    Write-ColorOutput "Red" "[ERROR] Trivy is not installed"
    Write-Host "Install with: choco install trivy"
    exit 1
}

# Create data directory if not exists
if (-not (Test-Path $DataDir)) {
    Write-ColorOutput "Yellow" "[INFO] Creating data directory: $DataDir"
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

# Update Trivy DB first
Write-ColorOutput "Cyan" "[INFO] Updating Trivy vulnerability database..."
Write-Host ""

try {
    & trivy image --download-db-only 2>&1 | ForEach-Object { Write-Host $_ }
    Write-Host ""
    Write-ColorOutput "Green" "[SUCCESS] Trivy DB updated"
}
catch {
    Write-ColorOutput "Yellow" "[WARNING] Could not update Trivy DB: $_"
}

# Copy DB files to project
Write-Host ""
Write-ColorOutput "Cyan" "[INFO] Copying DB files to project..."

$filesToCopy = @(
    @{ Source = "$TrivyCacheDir\db\trivy.db"; Dest = "$DataDir\trivy.db"; Name = "Vulnerability DB" },
    @{ Source = "$TrivyCacheDir\db\metadata.json"; Dest = "$DataDir\metadata.json"; Name = "DB Metadata" },
    @{ Source = "$TrivyCacheDir\java-db\trivy-java.db"; Dest = "$DataDir\trivy-java.db"; Name = "Java DB" },
    @{ Source = "$TrivyCacheDir\java-db\metadata.json"; Dest = "$DataDir\java-metadata.json"; Name = "Java Metadata" }
)

foreach ($file in $filesToCopy) {
    if (Test-Path $file.Source) {
        $sourceSize = (Get-Item $file.Source).Length / 1MB
        
        # Check if we should skip (UpdateOnly mode)
        if ($UpdateOnly -and (Test-Path $file.Dest)) {
            $sourceTime = (Get-Item $file.Source).LastWriteTime
            $destTime = (Get-Item $file.Dest).LastWriteTime
            if ($sourceTime -le $destTime -and -not $Force) {
                Write-ColorOutput "Gray" "  [SKIP] $($file.Name) - Already up to date"
                continue
            }
        }
        
        Copy-Item -Path $file.Source -Destination $file.Dest -Force
        Write-ColorOutput "Green" "  [OK] $($file.Name) ({0:N2} MB)" -f $sourceSize
    }
    else {
        Write-ColorOutput "Yellow" "  [SKIP] $($file.Name) - Source not found"
    }
}

# Display summary
Write-Host ""
Write-ColorOutput "Cyan" "========================================"
Write-ColorOutput "Cyan" "            Summary"
Write-ColorOutput "Cyan" "========================================"

# Read metadata if exists
$metadataPath = "$DataDir\metadata.json"
if (Test-Path $metadataPath) {
    $metadata = Get-Content $metadataPath | ConvertFrom-Json
    Write-Host ""
    Write-ColorOutput "White" "  DB Version:    $($metadata.Version)"
    Write-ColorOutput "White" "  Next Update:   $($metadata.NextUpdate)"
    Write-ColorOutput "White" "  Downloaded:    $($metadata.DownloadedAt)"
}

# Calculate total size
$totalSize = 0
Get-ChildItem $DataDir -File | ForEach-Object { $totalSize += $_.Length }
Write-Host ""
Write-ColorOutput "White" "  Location:      $DataDir"
Write-ColorOutput "White" "  Total Size:    {0:N2} MB" -f ($totalSize / 1MB)

Write-Host ""
Write-ColorOutput "Green" "[COMPLETE] Trivy DB synchronized to project"
Write-Host ""
