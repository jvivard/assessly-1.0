# Assesly AI Grading Backend

AI-powered grading platform for student worksheets using GPT-4o and Gemini 2.0 Flash.

## Features

- 📄 **File Upload**: Accept PDF/image uploads for questions, rubrics, and student work
- 🔍 **OCR Pipeline**: Extract text using GPT-4 Vision (math) and Google Cloud Vision (text subjects)
- 📋 **Rubric Parser**: Parse rubric PDFs into structured JSON with AI
- 🎓 **AI Grading**: Grade math (GPT-4o) and conceptual subjects (Gemini 2.0 Flash)
- ⚡ **Real-time Updates**: WebSocket support for live grading progress
- 🗄️ **Database Storage**: PostgreSQL with SQLAlchemy ORM
- 🚀 **Async Processing**: Celery for background grading tasks
- 📊 **Task Monitoring**: Flower dashboard for Celery tasks

## Tech Stack

- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL + SQLAlchemy
- **Cache**: Redis
- **Task Queue**: Celery
- **AI APIs**: 
  - OpenAI GPT-4o (math grading)
  - Google Gemini 2.0 Flash (conceptual grading)
  - Google Cloud Vision (OCR)

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- API Keys:
  - OpenAI API Key
  - Google Gemini API Key
  - Google Cloud Vision credentials (optional)

### Option 1: Docker Compose (Recommended)

1. **Clone and setup**:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Configure `.env`** with your API keys:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   GEMINI_API_KEY=your-gemini-key
   DATABASE_URL=postgresql://postgres:password@postgres:5432/assesly
   REDIS_URL=redis://redis:6379/0
   ```

3. **Start all services**:
   ```bash
   docker-compose up -d
   ```

4. **Access the API**:
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
   - Flower (Task Monitor): http://localhost:5555

### Option 2: Local Development

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Setup database**:
   ```bash
   # Create PostgreSQL database
   createdb assesly
   
   # Run migrations
   alembic upgrade head
   ```

3. **Start Redis**:
   ```bash
   redis-server
   ```

4. **Start Celery worker** (in separate terminal):
   ```bash
   celery -A celery_worker worker --loglevel=info
   ```

5. **Start FastAPI server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## API Endpoints

### File Upload

**POST** `/api/upload`
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@rubric.pdf" \
  -F "file_type=rubric" \
  -F "subject=math"
```

Response:
```json
{
  "file_id": "uuid-here",
  "status": "uploaded",
  "file_name": "rubric.pdf",
  "file_path": "./uploads/rubrics/uuid.pdf"
}
```

### Parse Rubric

**POST** `/api/upload/parse-rubric`
```bash
curl -X POST http://localhost:8000/api/upload/parse-rubric \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "./uploads/rubrics/uuid.pdf",
    "name": "Math Quiz 1",
    "subject": "math"
  }'
```

Response:
```json
{
  "rubric_id": 1,
  "name": "Math Quiz 1",
  "subject": "math",
  "criteria": {
    "questions": [
      {
        "number": 1,
        "total_points": 10,
        "parts": [
          {
            "part": "A",
            "points": 5,
            "criteria": "Must show work and arrive at correct answer"
          }
        ]
      }
    ]
  },
  "status": "parsed"
}
```

### Grade Submission

**POST** `/api/grading/grade`
```bash
curl -X POST http://localhost:8000/api/grading/grade \
  -H "Content-Type: application/json" \
  -d '{
    "question_file_path": "./uploads/worksheets/question.pdf",
    "rubric_id": 1,
    "student_work_file_path": "./uploads/student_work/answer.jpg",
    "student_name": "John Doe"
  }'
```

Response:
```json
{
  "job_id": "uuid-here",
  "status": "processing"
}
```

### Get Results

**GET** `/api/grading/results/{job_id}`
```bash
curl http://localhost:8000/api/grading/results/{job_id}
```

Response:
```json
{
  "status": "completed",
  "progress": 100,
  "results": {
    "score": 8.5,
    "max_points": 10,
    "feedback": "Good work! Minor arithmetic error in step 3.",
    "strengths": ["Clear work shown", "Correct method"],
    "weaknesses": ["Calculation error in final step"]
  }
}
```

### WebSocket (Real-time Updates)

Connect to: `ws://localhost:8000/ws/grading/{job_id}`

Example with JavaScript:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/grading/your-job-id');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progress: ${data.progress}% - ${data.message}`);
};
```

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── upload.py          # File upload endpoints
│   │   ├── grading.py         # Grading endpoints
│   │   └── websocket.py       # WebSocket handlers
│   ├── models/
│   │   ├── worksheet.py       # Worksheet model
│   │   ├── question.py        # Question model
│   │   ├── rubric.py          # Rubric model
│   │   └── grade.py           # Grade model
│   ├── services/
│   │   ├── ocr_service.py     # OCR logic
│   │   ├── rubric_parser.py   # Rubric parsing
│   │   ├── grading_engine.py  # AI grading
│   │   └── math_validator.py  # SymPy validation
│   ├── utils/
│   │   ├── file_handler.py    # File operations
│   │   ├── prompt_templates.py # AI prompts
│   │   └── redis_client.py    # Redis client
│   ├── config.py              # Configuration
│   ├── database.py            # Database setup
│   └── main.py                # FastAPI app
├── alembic/                   # Database migrations
├── celery_worker.py           # Celery tasks
├── docker-compose.yml         # Docker setup
├── Dockerfile
├── requirements.txt
└── README.md
```

## Database Schema

```sql
-- Worksheets
worksheets (
  id, teacher_id, file_path, file_name, file_type,
  status, subject, uploaded_at, processed_at
)

-- Questions
questions (
  id, worksheet_id, question_number, part,
  text, max_points, extracted_text
)

-- Rubrics
rubrics (
  id, name, file_path, subject,
  criteria_json, created_at
)

-- Grades
grades (
  id, worksheet_id, question_id, student_name,
  student_work_path, score, max_score, feedback,
  breakdown_json, graded_at
)
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `GOOGLE_API_KEY` | Google Cloud API key | No |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON | No |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `DEBUG` | Enable debug mode | No |
| `UPLOAD_DIR` | Directory for file uploads | No |
| `MAX_FILE_SIZE` | Max file size in bytes | No |
| `ALLOWED_ORIGINS` | CORS allowed origins | No |

## Development

### Run Tests
```bash
pytest
```

### Format Code
```bash
black .
```

### Database Migrations

Create new migration:
```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback:
```bash
alembic downgrade -1
```

### Celery Monitoring

Access Flower dashboard:
```
http://localhost:5555
```

## Performance

- **Average grading time**: <30 seconds per worksheet
- **Concurrent jobs**: Supports 10+ concurrent grading jobs
- **Scalability**: Horizontal scaling with multiple Celery workers

## Cost Optimization

- Math subjects use GPT-4o (better accuracy, higher cost)
- Text subjects use Gemini 2.0 Flash (good quality, lower cost)
- Rubrics are cached in Redis to avoid re-parsing
- Direct PDF text extraction before OCR (when possible)

## Troubleshooting

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping  # Should return "PONG"

# Start Redis
redis-server
```

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Create database if missing
createdb assesly
```

### API Key Issues
- Ensure `.env` file has valid API keys
- Check API key permissions and quotas
- Verify environment variables are loaded: `echo $OPENAI_API_KEY`

## Production Deployment

1. **Security**:
   - Use strong database passwords
   - Enable SSL for PostgreSQL
   - Use environment secrets management
   - Enable API authentication

2. **Scaling**:
   - Deploy multiple Celery workers
   - Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
   - Use managed Redis (AWS ElastiCache, Redis Cloud)

3. **Monitoring**:
   - Setup application logging (Sentry, LogRocket)
   - Monitor API metrics
   - Track grading costs and usage

## License

MIT License

## Support

For issues or questions, please contact support@assesly.com

