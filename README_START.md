# Starting the Application

## Option 1: Run in separate terminal windows (Recommended for seeing logs)

### Terminal 1 - Backend:
```bash
./start-backend.sh
```

### Terminal 2 - Frontend:
```bash
./start-frontend.sh
```

## Option 2: Run both in one terminal (using background)

### Start Backend:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### In another terminal, start Frontend:
```bash
cd frontend
export VITE_API_URL=http://localhost:8000
npm run dev
```

## URLs:
- Backend API: http://localhost:8000
- Frontend: http://localhost:5173

## Logs:
All logs will appear directly in your terminal windows - no log files!

