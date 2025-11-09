#!/bin/bash
set -e

# Get PORT from environment or use default
PORT=${PORT:-8000}

echo "Starting Assesly Backend on port $PORT"

# Start uvicorn
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT

