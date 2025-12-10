#!/bin/bash
# Start frontend server with logs to terminal

cd "$(dirname "$0")/frontend"
export VITE_API_URL=http://localhost:8000
echo "Starting frontend server on http://localhost:5173"
echo "Logs will appear below..."
echo "---"
npm run dev

