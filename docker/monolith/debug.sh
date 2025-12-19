#!/bin/bash
echo "=== API Error Logs ==="
docker exec jasca cat /var/log/api.err
echo "=== API Output Logs ==="
docker exec jasca cat /var/log/api.log
echo "=== Supervisor Logs ==="
docker exec jasca cat /var/log/supervisord.log
echo "=== Postgres Logs ==="
docker exec jasca cat /var/log/postgresql.err
