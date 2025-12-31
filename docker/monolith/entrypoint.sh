#!/bin/bash
set -e

# Data directories
PG_DATA="/var/lib/postgresql/data"
REDIS_DATA="/var/lib/redis"

echo "Initializing JASCA Monolithic Container..."
echo "--- ENTRYPOINT V2 (OFFLINE FIX) ---"

# Ensure permissions
chown -R postgres:postgres "$PG_DATA"
chown -R redis:redis "$REDIS_DATA"
chmod 0700 "$PG_DATA"

# Initialize Postgres if empty
if [ -z "$(ls -A "$PG_DATA")" ]; then
    echo "This is a fresh install. Initializing Database..."
    
    # Init DB with Korean locale
    su - postgres -c "/usr/lib/postgresql/14/bin/initdb --locale=ko_KR.UTF-8 -D $PG_DATA"
    
    # Configure Postgres to allow local connections
    echo "host all all 127.0.0.1/32 md5" >> "$PG_DATA/pg_hba.conf"
    echo "listen_addresses='*'" >> "$PG_DATA/postgresql.conf"
    
    echo "Starting temporary Postgres for setup..."
    su - postgres -c "/usr/lib/postgresql/14/bin/pg_ctl -D $PG_DATA -w start"
    
    echo "Creating 'jasca' user and database..."
    su - postgres -c "psql -c \"CREATE USER jasca WITH PASSWORD 'jasca_secret';\""
    su - postgres -c "psql -c \"CREATE DATABASE jasca OWNER jasca;\""
    su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE jasca TO jasca;\""
    # Sometimes GRANT ALL on DATABASE isn't enough for schema creation depending on pg version/setup
    su - postgres -c "psql -d jasca -c \"GRANT ALL ON SCHEMA public TO jasca;\""

    echo "Waiting for Postgres to be ready..."
    until su - postgres -c "pg_isready -h localhost -p 5432"; do
        echo "Postgres is unavailable - sleeping"
        sleep 1
    done

    echo "Running Prisma Migrations..."
    # cd /app/apps/api  <-- Removing this as node_modules are in /app
    
    # Disable Prisma update checks/telemetry which can hang in offline mode
    export CHECKPOINT_DISABLE=1
    
    # Ensure DATABASE_URL is set for the migration - force IPv4 and no SSL for local socket safety
    export DATABASE_URL="postgresql://jasca:jasca_secret@127.0.0.1:5432/jasca?sslmode=disable"
    
    echo "Checking Prisma version..."
    /app/node_modules/.bin/prisma --version
    
    # Use direct binary execution with explicit schema path (absolute paths to be safe)
    /app/node_modules/.bin/prisma migrate deploy --schema=/app/apps/api/prisma/schema.prisma
 
    echo "Running database seed..."
    node /app/apps/api/prisma/seed.js
 
    echo "Stopping temporary Postgres..."
    su - postgres -c "/usr/lib/postgresql/14/bin/pg_ctl -D $PG_DATA -m fast -w stop"
    
    echo "Database initialization complete."
fi

# Execute the passed command (usually supervisord)
exec "$@"
