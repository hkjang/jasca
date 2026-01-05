# Trivy Security Scanner Script
# Usage: .\run-trivy.ps1 [-Target <path>] [-ScanType <type>] [-Format <format>] [-Output <file>]

param(
    [string]$Target = ".",
    [ValidateSet("fs", "image", "repo", "config")]
    [string]$ScanType = "fs",
    [ValidateSet("table", "json", "sarif", "template", "cyclonedx", "spdx")]
    [string]$Format = "table",
    [string]$Output = "",
    [string]$Severity = "CRITICAL,HIGH,MEDIUM,LOW",
    [switch]$IgnoreUnfixed,
    [switch]$Quiet
)

# Colors for output
function Write-ColorOutput($Color, $Message) {
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "Cyan" "========================================"
Write-ColorOutput "Cyan" "       Trivy Security Scanner"
Write-ColorOutput "Cyan" "========================================"
Write-Host ""

# Check if Trivy is installed
$trivyPath = Get-Command trivy -ErrorAction SilentlyContinue
if (-not $trivyPath) {
    Write-ColorOutput "Red" "[ERROR] Trivy is not installed or not in PATH"
    Write-Host ""
    Write-Host "Install Trivy using one of the following methods:"
    Write-Host "  - Chocolatey: choco install trivy"
    Write-Host "  - Scoop: scoop install trivy"
    Write-Host "  - Download: https://github.com/aquasecurity/trivy/releases"
    exit 1
}

Write-ColorOutput "Green" "[INFO] Trivy found at: $($trivyPath.Source)"
Write-Host ""

# Build command arguments
$args = @($ScanType, $Target)

# Add severity filter
$args += "--severity", $Severity

# Add format
$args += "--format", $Format

# Add output file if specified
if ($Output -ne "") {
    $args += "--output", $Output
    Write-ColorOutput "Yellow" "[INFO] Output will be saved to: $Output"
}

# Add ignore unfixed flag
if ($IgnoreUnfixed) {
    $args += "--ignore-unfixed"
}

# Add quiet flag
if ($Quiet) {
    $args += "--quiet"
}

Write-ColorOutput "Cyan" "[INFO] Running: trivy $($args -join ' ')"
Write-Host ""
Write-ColorOutput "Cyan" "----------------------------------------"

# Run Trivy
& trivy @args

$exitCode = $LASTEXITCODE

Write-Host ""
Write-ColorOutput "Cyan" "----------------------------------------"

if ($exitCode -eq 0) {
    Write-ColorOutput "Green" "[SUCCESS] Scan completed successfully"
} else {
    Write-ColorOutput "Red" "[WARNING] Scan completed with exit code: $exitCode"
}

exit $exitCode
