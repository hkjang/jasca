#!/bin/bash

# Script to load and run JASCA in an offline environment

IMAGE_TAR="jasca-offline.tar"
IMAGE_NAME="jasca-offline:latest"
CONTAINER_NAME="jasca"

# 1. Load the image
if [ -f "$IMAGE_TAR" ]; then
    echo "removing old image..."
    docker rmi $IMAGE_NAME || true
    echo "Loading Docker image from $IMAGE_TAR..."
    docker load -i "$IMAGE_TAR"
else
    echo "Error: $IMAGE_TAR not found!"
    exit 1
fi

# 2. Create volumes if they don't exist
docker volume create jasca_pg_data
docker volume create jasca_redis_data

# 3. Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Stopping and removing existing container..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
fi

# 4. Run the container
echo "Starting JASCA container..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p 3000:3000 \
  -p 3001:3001 \
  -v jasca_pg_data:/var/lib/postgresql/data \
  -v jasca_redis_data:/var/lib/redis \
  $IMAGE_NAME

echo "JASCA is running!"
echo "Web: http://localhost:3000"
echo "API: http://localhost:3001"
