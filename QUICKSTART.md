# Quick Start

## Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/jvivard/assessly.git
cd assessly
npm install
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
cd backend
# Create .env file with:
OPENAI_API_KEY=your-key
GEMINI_API_KEY=your-key
DATABASE_URL=postgresql://postgres:password@localhost:5432/assessly
REDIS_URL=redis://localhost:6379/0
```

### 4. Database
```bash
createdb assessly
alembic upgrade head
```

### 5. Run
```bash
# Terminal 1 - Redis
redis-server

# Terminal 2 - Celery
cd backend
celery -A celery_worker worker --loglevel=info

# Terminal 3 - Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 4 - Frontend
npm run dev
```

## Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Docker (Alternative)
```bash
cd backend
cp .env.example .env
# Edit .env with your keys
docker-compose up -d
```
Frontend still runs with `npm run dev`

