#!/bin/bash

# Create trivy-db directory if it doesn't exist (for environments without offline DB)
mkdir -p trivy-db

docker build --no-cache -f docker/monolith/Dockerfile -t jasca-offline .
