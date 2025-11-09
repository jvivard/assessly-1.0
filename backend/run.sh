#!/bin/bash

# Assesly Backend Startup Script

echo "================================"
echo "Starting Assesly AI Grading Backend"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.example to .env and configure your API keys"
    exit 1
fi

echo "✓ Environment file found"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo "✓ Dependencies installed"

# Initialize database
echo ""
echo "Initializing database..."
python scripts/init_db.py

echo ""
echo "================================"
echo "Starting FastAPI server..."
echo "================================"
echo ""
echo "API will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

