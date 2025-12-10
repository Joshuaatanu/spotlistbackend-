#!/bin/bash
# Start backend server with logs to terminal

cd "$(dirname "$0")/backend"
source venv/bin/activate
echo "Starting backend server on http://localhost:8000"
echo "Logs will appear below..."
echo "---"
uvicorn main:app --reload --host 0.0.0.0 --port 8000

