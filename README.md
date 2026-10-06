# FixMyCity MVP

## Stack
Frontend: React + Vite
Backend: FastAPI
Database: SQLite
Auth: JWT
Uploads: local `backend/uploads`

## Run backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## Run frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Demo accounts
First call:
POST http://127.0.0.1:8000/admin/seed-demo
Then:
citizen@fixmycity.com / Demo@123
officer@fixmycity.com / Demo@123
admin@fixmycity.com / Demo@123

## Current MVP
- Register/login
- Citizen complaint form
- Image upload
- GPS location
- Automatic category routing (rule-based placeholder)
- Priority placeholder
- Citizen complaint tracking
- Officer/Admin status dashboard

AI models such as YOLOv8 and BERT can be integrated after this base system works.
