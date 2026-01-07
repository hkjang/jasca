# Create trivy-db directory if it doesn't exist (for environments without offline DB)
if (-not (Test-Path "trivy-db")) { New-Item -ItemType Directory -Path "trivy-db" | Out-Null }

docker build -f docker/monolith/Dockerfile -t jasca-offline .
