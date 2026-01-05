# Trivy Docker Image Scanner Script
# Usage: .\trivy-docker.ps1 [-ImageName <name>] [-Format <format>] [-Output <file>]

param(
    [Parameter(Mandatory = $false)]
    [string]$ImageName = "",
    [ValidateSet("table", "json", "sarif", "cyclonedx", "spdx")]
    [string]$Format = "table",
    [string]$Output = "",
    [string]$Severity = "CRITICAL,HIGH,MEDIUM",
    [switch]$ScanAll,
    [switch]$IgnoreUnfixed
)

function Write-ColorOutput($Color, $Message) {
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "Cyan" "========================================"
Write-ColorOutput "Cyan" "     Trivy Docker Image Scanner"
Write-ColorOutput "Cyan" "========================================"
Write-Host ""

# Check if Docker is running
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "Red" "[ERROR] Docker is not running"
    exit 1
}

# If no image specified, scan all local images
if ($ImageName -eq "" -or $ScanAll) {
    Write-ColorOutput "Yellow" "[INFO] Scanning all local Docker images..."
    Write-Host ""
    
    $images = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -ne "<none>:<none>" }
    
    foreach ($image in $images) {
        Write-ColorOutput "Cyan" "----------------------------------------"
        Write-ColorOutput "Green" "[SCANNING] $image"
        Write-ColorOutput "Cyan" "----------------------------------------"
        
        $args = @("image", $image, "--severity", $Severity, "--format", $Format)
        
        if ($IgnoreUnfixed) {
            $args += "--ignore-unfixed"
        }
        
        & trivy @args
        Write-Host ""
    }
}
else {
    Write-ColorOutput "Green" "[INFO] Scanning image: $ImageName"
    Write-Host ""
    
    $args = @("image", $ImageName, "--severity", $Severity, "--format", $Format)
    
    if ($Output -ne "") {
        $args += "--output", $Output
    }
    
    if ($IgnoreUnfixed) {
        $args += "--ignore-unfixed"
    }
    
    & trivy @args
}

Write-Host ""
Write-ColorOutput "Cyan" "========================================"
Write-ColorOutput "Green" "[COMPLETE] Docker image scan finished"
Write-ColorOutput "Cyan" "========================================"
