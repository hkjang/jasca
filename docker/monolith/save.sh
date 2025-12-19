#!/bin/bash
echo "Saving image to jasca-offline.tar..."
docker save jasca-offline -o jasca-offline.tar
echo "Done. You can transfer jasca-offline.tar to your offline environment."
