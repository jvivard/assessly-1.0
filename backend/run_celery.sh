#!/bin/bash

# Celery Worker Startup Script

echo "================================"
echo "Starting Celery Worker"
echo "================================"
echo ""

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

echo "Starting Celery worker with 4 concurrent workers..."
echo "Press Ctrl+C to stop"
echo ""

celery -A celery_worker worker --loglevel=info --concurrency=4

