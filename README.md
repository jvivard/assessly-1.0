# Assessly - AI-Powered Grading Platform

An intelligent grading system that automates the assessment of student worksheets using advanced AI models. Assessly combines OCR, natural language processing, and AI-powered evaluation to provide accurate, consistent, and detailed feedback on student work.

![Assessly Dashboard](https://img.shields.io/badge/Status-Production_Ready-green)
![License](https://img.shields.io/badge/License-MIT-blue)
<img width="1813" height="700" alt="Screenshot 2025-10-27 030339" src="https://github.com/user-attachments/assets/cf31f9ba-3550-4640-8183-e00087f7aa49" />

<img width="1868" height="942" alt="Screenshot 2025-10-27 030327" src="https://github.com/user-attachments/assets/a956514d-b82c-4841-9b7b-5f9970bc5301" />


## 🌟 Features

- **📄 Multi-Format Support**: Upload PDFs and images for questions, rubrics, and student work
- **🔍 Advanced OCR**: Extract text using GPT-4 Vision for mathematical content and PaddleOCR-VL for text
- **📋 Smart Rubric Parsing**: AI-powered rubric extraction and structured JSON conversion
- **🎓 Dual AI Grading Engine**: 
  - GPT-4o for mathematical problems (high accuracy)
  - Gemini 2.0 Flash for conceptual subjects (cost-effective)
- **⚡ Real-Time Updates**: WebSocket integration for live grading progress tracking
- **📊 Interactive Canvas**: Annotate and grade submissions directly in the browser
- **🗄️ Robust Data Storage**: PostgreSQL database with SQLAlchemy ORM
- **🚀 Background Processing**: Celery-based async task queue with Redis
- **📈 Task Monitoring**: Flower dashboard for job monitoring
- **🎨 Modern UI**: Next.js frontend with Tailwind CSS and shadcn/ui components

- <img width="1742" height="955" alt="Screenshot 2025-10-27 030429" src="https://github.com/user-attachments/assets/13213ccf-6b5e-4604-9633-23f73dbb0dee" />

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Hooks
- **API Communication**: Fetch API with WebSocket support

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+ with SQLAlchemy ORM
- **Cache & Queue**: Redis 7+
- **Task Queue**: Celery with Redis broker
- **AI APIs**:
  - OpenAI GPT-4o (mathematical grading)
  - Google Gemini 2.0 Flash (conceptual grading)
  - Google Cloud Vision (OCR)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- API Keys:
  - OpenAI API Key
  - Google Gemini API Key
  - Google Cloud Vision credentials (optional)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/jvivard/assessly.git
cd assessly
```

#### 2. Frontend Setup

```bash
# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev
# or
pnpm dev
```

The frontend will be available at `http://localhost:3000`

#### 3. Backend Setup

##### Option A: Docker Compose (Recommended)

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your API keys

# Start all services (PostgreSQL, Redis, Celery, FastAPI)
docker-compose up -d
```

##### Option B: Local Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup database
createdb assessly
alembic upgrade head

# Start Redis
redis-server

# Start Celery worker (new terminal)
celery -A celery_worker worker --loglevel=info

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000`

### Environment Configuration

Create a `.env` file in the `backend` directory:

```env
# API Keys
OPENAI_API_KEY=sk-your-openai-key-here
GEMINI_API_KEY=your-gemini-key-here
GOOGLE_API_KEY=your-google-api-key  # Optional

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/assessly

# Redis
REDIS_URL=redis://localhost:6379/0


```

## 📖 Usage

### 1. Upload Question Sheet

Upload the original question paper or worksheet that contains the problems students need to solve.

### 2. Upload Rubric

Upload a rubric PDF that defines the grading criteria, point allocations, and expected answers for each question.

### 3. Upload Student Work

Upload student submissions (PDFs or images) containing their answers.

### 4. Start Grading

The system will:
- Extract text from all documents using OCR
- Parse the rubric into structured criteria
- Grade student work against the rubric using AI
- Provide detailed feedback, scores, and suggestions

### 5. Review Results

View comprehensive grading results including:
- Overall score
- Per-question breakdown
- Detailed feedback
- Strengths and areas for improvement
- Annotated submissions

## 📁 Project Structure

```
assessly/
├── app/                      # Next.js frontend
│   ├── classes/             # Class management pages
│   ├── grade-canvas/        # Grading canvas interface
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── alembic/            # Database migrations
│   ├── docker-compose.yml
│   └── requirements.txt
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── dashboard-content.tsx
│   ├── grading-canvas-*.tsx
│   └── header.tsx


## 🔌 API Endpoints

### File Upload
```bash
POST /api/upload
Content-Type: multipart/form-data

Parameters:
- file: File to upload
- file_type: "question" | "rubric" | "student_work"
- subject: "math" | "science" | "english" | etc.
```


### Start Grading
```bash
POST /api/grading/grade
Content-Type: application/json

{
  "question_file_path": "./uploads/worksheets/question.pdf",
  "rubric_id": 1,
  "student_work_file_path": "./uploads/student_work/answer.jpg",
  "student_name": "John Doe"
}
```

### Get Results
```bash
GET /api/grading/results/{job_id}
```

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/grading/{job_id}');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progress: ${data.progress}%`);
};
```

For detailed API documentation, visit `http://localhost:8000/docs` after starting the backend.

## 🧪 Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
npm test
```

### Code Formatting

```bash
# Backend
cd backend
black .

# Frontend
npm run lint
```

### Database Migrations

```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 📊 Performance

- **Average grading time**: < 30 seconds per worksheet
- **Concurrent processing**: Supports 10+ simultaneous grading jobs
- **Scalability**: Horizontally scalable with multiple Celery workers

## 💰 Cost Optimization

- Mathematical subjects use GPT-4o for higher accuracy
- Text-based subjects use Gemini 2.0 Flash for cost efficiency
- Rubrics are cached in Redis to avoid redundant API calls
- Direct PDF text extraction reduces OCR API usage

## 🔒 Security

- Environment variables for sensitive API keys
- CORS protection configured
- File upload validation and size limits
- Secure WebSocket connections
- SQL injection protection via SQLAlchemy ORM

## 🐛 Troubleshooting

### Redis Connection Error
```bash
# Verify Redis is running
redis-cli ping  # Should return "PONG"

# Start Redis if needed
redis-server
```

### Database Connection Error
```bash
# Check PostgreSQL status
pg_isready

# Create database if missing
createdb assessly
```

### API Key Issues
- Verify `.env` file contains valid API keys
- Check API key permissions and rate limits
- Ensure environment variables are loaded properly

## 🚀 Production Deployment

### Security Checklist
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for PostgreSQL
- [ ] Implement API authentication and authorization
- [ ] Use secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS for all connections

### Scaling
- Deploy multiple Celery workers for parallel processing
- Use managed database services (AWS RDS, Google Cloud SQL)
- Use managed Redis (AWS ElastiCache, Redis Cloud)
- Implement CDN for static assets
- Add load balancer for API servers



## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **jvivard** - *Initial work* - [jvivard](https://github.com/jvivard)

## 🙏 Acknowledgments

- OpenAI for GPT-4o API
- Google for Gemini 2.0 Flash and Cloud Vision APIs
- shadcn for the beautiful UI components
- FastAPI and Next.js communities

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on [GitHub](https://github.com/jvivard/assessly/issues)
- Contact: ggakavishnu@gmail.com

---

**Made with ❤️ by the Assessly Team**

