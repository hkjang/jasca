# JASCA Offline Deployment Instructions

## Prerequisites
- Docker installed on the target machine.
- The `jasca-offline.tar` file.
- The `start.sh` script.

## Steps to Deploy

1.  **Transfer Files**: Copy `jasca-offline.tar` and `start.sh` to a directory on your offline server.
2.  **Make Script Executable**:
    ```bash
    chmod +x start.sh
    ```
3.  **Run**:
    ```bash
    ./start.sh
    ```

## Manual Steps (if script fails)

1.  **Load Image**:
    ```bash
    docker load -i jasca-offline.tar
    ```
2.  **Run Container**:
    ```bash
    docker run -d --name jasca \
      -p 3000:3000 \
      -p 3001:3001 \
      -v jasca_pg_data:/var/lib/postgresql/data \
      -v jasca_redis_data:/var/lib/redis \
      jasca-offline:latest
    ```
