# Assesly Quick Start Guide

Get up and running with Assesly AI Grading in under 5 minutes!

## Prerequisites Checklist

- [ ] Python 3.11 or higher installed
- [ ] PostgreSQL 15 or higher installed and running
- [ ] Redis 7 or higher installed and running
- [ ] OpenAI API key (for GPT-4o)
- [ ] Google Gemini API key

## 🚀 Quick Start (Docker - Easiest)

### 1. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
OPENAI_API_KEY=sk-your-actual-openai-key
GEMINI_API_KEY=your-actual-gemini-key
```

### 2. Start Everything

```bash
docker-compose up -d
```

That's it! ✨

### 3. Verify

- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Flower: http://localhost:5555

## 🛠 Quick Start (Local Development)

### 1. Setup Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Setup Database

```bash
# Create database
createdb assesly

# Run migrations
alembic upgrade head

# Initialize with sample data
python scripts/init_db.py
```

### 5. Start Services

**Terminal 1 - Redis:**
```bash
redis-server
```

**Terminal 2 - FastAPI Server:**
```bash
uvicorn app.main:app --reload --port 8000
```

**Terminal 3 - Celery Worker (Optional):**
```bash
celery -A celery_worker worker --loglevel=info
```

Or use the convenience scripts:

```bash
# Terminal 1
./run.sh

# Terminal 2
./run_celery.sh
```

## 📝 Your First Grading Request

### 1. Upload a Rubric

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@your_rubric.pdf" \
  -F "file_type=rubric" \
  -F "subject=math"
```

Response:
```json
{
  "file_id": "abc-123",
  "status": "uploaded",
  "file_name": "your_rubric.pdf",
  "file_path": "./uploads/rubrics/abc-123.pdf"
}
```

### 2. Parse the Rubric

```bash
curl -X POST http://localhost:8000/api/upload/parse-rubric \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "./uploads/rubrics/abc-123.pdf",
    "name": "Math Quiz 1",
    "subject": "math"
  }'
```

Response includes `rubric_id` - save this!

### 3. Upload Student Work

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@student_answer.jpg" \
  -F "file_type=student_work"
```

### 4. Grade the Submission

```bash
curl -X POST http://localhost:8000/api/grading/grade \
  -H "Content-Type: application/json" \
  -d '{
    "question_file_path": "./uploads/worksheets/question.pdf",
    "rubric_id": 1,
    "student_work_file_path": "./uploads/student_work/xyz-456.jpg",
    "student_name": "John Doe"
  }'
```

Response:
```json
{
  "job_id": "grading-job-789",
  "status": "processing"
}
```

### 5. Check Results

```bash
curl http://localhost:8000/api/grading/results/grading-job-789
```

Or watch in real-time with WebSocket!

## 🔍 Troubleshooting

### "Connection refused" Error

**Problem:** Can't connect to API

**Solution:**
```bash
# Check if server is running
curl http://localhost:8000/health

# If not, start it
uvicorn app.main:app --reload --port 8000
```

### "Redis connection failed"

**Problem:** Redis not running

**Solution:**
```bash
# Check Redis
redis-cli ping  # Should return "PONG"

# Start Redis
redis-server
```

### "Database connection error"

**Problem:** PostgreSQL not running or database doesn't exist

**Solution:**
```bash
# Check if PostgreSQL is running
pg_isready

# Create database
createdb assesly

# Run migrations
alembic upgrade head
```

### "Invalid API key"

**Problem:** API keys not configured or invalid

**Solution:**
1. Check `.env` file has valid keys
2. Ensure no quotes around the keys in `.env`
3. Restart the server after changing `.env`

### "Module not found" Errors

**Problem:** Dependencies not installed

**Solution:**
```bash
pip install -r requirements.txt
```

## 🧪 Test the API

Run the test script:

```bash
python scripts/test_api.py
```

Or use the interactive API docs:

👉 http://localhost:8000/docs

## 📊 Monitor Tasks

Access Celery Flower dashboard:

👉 http://localhost:5555

## 🎯 What's Next?

1. **Integrate with Frontend**: The frontend is ready - just point it to `http://localhost:8000`
2. **Add Authentication**: Implement user authentication for multi-teacher support
3. **Optimize Costs**: Monitor API usage in production
4. **Scale Workers**: Add more Celery workers for concurrent grading

## 📚 More Resources

- Full Documentation: `README.md`
- API Documentation: http://localhost:8000/docs
- Database Schema: See `app/models/`
- Example Prompts: `app/utils/prompt_templates.py`

## 💡 Pro Tips

1. **Use Docker**: Easiest way to get started
2. **Watch Logs**: Check terminal output for debugging
3. **Test with Sample Data**: Use the initialized sample rubric
4. **Monitor Costs**: Keep an eye on OpenAI API usage
5. **Cache Rubrics**: Parsed rubrics are cached in Redis automatically

## 🆘 Need Help?

- Check logs in terminal output
- Visit API docs at `/docs`
- Review `README.md` for detailed information
- Ensure all services are running (FastAPI, Redis, PostgreSQL)

---

**Happy Grading! 🎓**

