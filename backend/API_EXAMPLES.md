# API Usage Examples

Complete examples for all API endpoints.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently no authentication required (add in production).

---

## 1. File Upload

### Upload Worksheet

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@worksheet.pdf" \
  -F "file_type=worksheet" \
  -F "subject=math"
```

**Response:**
```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "worksheet_id": 1,
  "status": "uploaded",
  "file_name": "worksheet.pdf",
  "file_path": "./uploads/worksheets/550e8400-e29b-41d4-a716-446655440000.pdf"
}
```

### Upload Rubric

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@rubric.pdf" \
  -F "file_type=rubric" \
  -F "subject=math"
```

### Upload Student Work

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@student_answer.jpg" \
  -F "file_type=student_work"
```

---

## 2. Rubric Management

### Parse Rubric

```bash
curl -X POST http://localhost:8000/api/upload/parse-rubric \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "./uploads/rubrics/abc-123.pdf",
    "name": "Algebra Quiz 1",
    "subject": "math"
  }'
```

**Response:**
```json
{
  "rubric_id": 1,
  "name": "Algebra Quiz 1",
  "subject": "math",
  "criteria": {
    "subject": "math",
    "total_points": 20,
    "questions": [
      {
        "number": 1,
        "total_points": 10,
        "parts": [
          {
            "part": "A",
            "points": 5,
            "criteria": "Solve for x, showing all work"
          },
          {
            "part": "B",
            "points": 5,
            "criteria": "Simplify the expression"
          }
        ]
      }
    ]
  },
  "status": "parsed"
}
```

### List All Rubrics

```bash
curl http://localhost:8000/api/upload/rubrics
```

**Response:**
```json
{
  "rubrics": [
    {
      "id": 1,
      "name": "Algebra Quiz 1",
      "subject": "math",
      "created_at": "2024-01-15T10:30:00"
    },
    {
      "id": 2,
      "name": "English Essay Rubric",
      "subject": "english",
      "created_at": "2024-01-14T09:15:00"
    }
  ]
}
```

### Get Specific Rubric

```bash
curl http://localhost:8000/api/upload/rubrics/1
```

---

## 3. Grading

### Grade Single Submission

```bash
curl -X POST http://localhost:8000/api/grading/grade \
  -H "Content-Type: application/json" \
  -d '{
    "question_file_path": "./uploads/worksheets/question-123.pdf",
    "rubric_id": 1,
    "student_work_file_path": "./uploads/student_work/answer-456.jpg",
    "student_name": "Alice Johnson"
  }'
```

**Response:**
```json
{
  "job_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "processing"
}
```

### Grade Multiple Submissions (Bulk)

```bash
curl -X POST http://localhost:8000/api/grading/grade-bulk \
  -H "Content-Type: application/json" \
  -d '{
    "worksheet_id": 1,
    "rubric_id": 1,
    "student_submissions": [
      {
        "student_name": "Alice Johnson",
        "file_path": "./uploads/student_work/alice.jpg"
      },
      {
        "student_name": "Bob Smith",
        "file_path": "./uploads/student_work/bob.jpg"
      },
      {
        "student_name": "Carol Davis",
        "file_path": "./uploads/student_work/carol.jpg"
      }
    ]
  }'
```

**Response:**
```json
{
  "job_id": "8d0e7690-8536-51ef-b05c-f18gd2g01bf8",
  "status": "processing",
  "total_submissions": 3
}
```

---

## 4. Results

### Get Grading Results

```bash
curl http://localhost:8000/api/grading/results/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

**Response (Processing):**
```json
{
  "status": "processing",
  "progress": 60,
  "message": "Analyzing student work..."
}
```

**Response (Completed):**
```json
{
  "status": "completed",
  "progress": 100,
  "message": "Grading completed!",
  "results": {
    "score": 8.5,
    "max_points": 10,
    "feedback": "Good work overall! Your approach was correct and you showed clear work. There was a minor arithmetic error in step 3 where you calculated 5 × 3 = 16 instead of 15. This affected your final answer. Otherwise, excellent problem-solving!",
    "strengths": [
      "Clear and organized work",
      "Correct problem-solving approach",
      "Proper use of algebraic notation"
    ],
    "weaknesses": [
      "Arithmetic error in multiplication",
      "Final answer incorrect due to calculation mistake"
    ],
    "step_analysis": "Step 1: Correctly identified the equation to solve ✓\nStep 2: Proper use of distributive property ✓\nStep 3: Arithmetic error: 5 × 3 = 16 (should be 15) ✗\nStep 4: Continued with incorrect value\nStep 5: Final answer incorrect as a result"
  }
}
```

### Get All Grades for a Worksheet

```bash
curl http://localhost:8000/api/grading/grades/worksheet/1
```

**Response:**
```json
{
  "worksheet_id": 1,
  "total_grades": 3,
  "grades": [
    {
      "id": 1,
      "student_name": "Alice Johnson",
      "question_id": 1,
      "score": 8.5,
      "max_score": 10,
      "feedback": "Good work overall...",
      "breakdown": null,
      "graded_at": "2024-01-15T14:22:00"
    },
    {
      "id": 2,
      "student_name": "Bob Smith",
      "question_id": 1,
      "score": 9.0,
      "max_score": 10,
      "feedback": "Excellent work!...",
      "breakdown": null,
      "graded_at": "2024-01-15T14:23:00"
    }
  ]
}
```

---

## 5. WebSocket (Real-time Updates)

### JavaScript Example

```javascript
// Connect to WebSocket
const jobId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const ws = new WebSocket(`ws://localhost:8000/ws/grading/${jobId}`);

// Handle messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Status: ${data.status}`);
  console.log(`Progress: ${data.progress}%`);
  console.log(`Message: ${data.message}`);
  
  if (data.status === 'completed') {
    console.log('Results:', data.results);
    ws.close();
  }
};

// Handle errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// Handle close
ws.onclose = () => {
  console.log('WebSocket connection closed');
};
```

### Python Example

```python
import asyncio
import websockets
import json

async def watch_grading(job_id):
    uri = f"ws://localhost:8000/ws/grading/{job_id}"
    
    async with websockets.connect(uri) as websocket:
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            
            print(f"Status: {data['status']}")
            print(f"Progress: {data['progress']}%")
            print(f"Message: {data['message']}")
            
            if data['status'] in ['completed', 'failed']:
                if 'results' in data:
                    print(f"Final Score: {data['results']['score']}")
                break

# Run
asyncio.run(watch_grading("7c9e6679-7425-40de-944b-e07fc1f90ae7"))
```

---

## 6. Health Check

### Check API Health

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

### Get API Info

```bash
curl http://localhost:8000/
```

**Response:**
```json
{
  "name": "Assesly AI Grading API",
  "version": "1.0.0",
  "status": "running",
  "docs": "/docs"
}
```

---

## Complete Workflow Example

Here's a complete workflow from upload to grading:

```bash
#!/bin/bash

# 1. Upload rubric
echo "Uploading rubric..."
RUBRIC_RESPONSE=$(curl -s -X POST http://localhost:8000/api/upload \
  -F "file=@rubric.pdf" \
  -F "file_type=rubric" \
  -F "subject=math")

RUBRIC_PATH=$(echo $RUBRIC_RESPONSE | jq -r '.file_path')
echo "Rubric uploaded: $RUBRIC_PATH"

# 2. Parse rubric
echo "Parsing rubric..."
PARSE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/upload/parse-rubric \
  -H "Content-Type: application/json" \
  -d "{
    \"file_path\": \"$RUBRIC_PATH\",
    \"name\": \"Math Quiz 1\",
    \"subject\": \"math\"
  }")

RUBRIC_ID=$(echo $PARSE_RESPONSE | jq -r '.rubric_id')
echo "Rubric ID: $RUBRIC_ID"

# 3. Upload question
echo "Uploading question..."
QUESTION_RESPONSE=$(curl -s -X POST http://localhost:8000/api/upload \
  -F "file=@question.pdf" \
  -F "file_type=worksheet" \
  -F "subject=math")

QUESTION_PATH=$(echo $QUESTION_RESPONSE | jq -r '.file_path')
echo "Question uploaded: $QUESTION_PATH"

# 4. Upload student work
echo "Uploading student work..."
STUDENT_RESPONSE=$(curl -s -X POST http://localhost:8000/api/upload \
  -F "file=@student_answer.jpg" \
  -F "file_type=student_work")

STUDENT_PATH=$(echo $STUDENT_RESPONSE | jq -r '.file_path')
echo "Student work uploaded: $STUDENT_PATH"

# 5. Start grading
echo "Starting grading..."
GRADE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/grading/grade \
  -H "Content-Type: application/json" \
  -d "{
    \"question_file_path\": \"$QUESTION_PATH\",
    \"rubric_id\": $RUBRIC_ID,
    \"student_work_file_path\": \"$STUDENT_PATH\",
    \"student_name\": \"John Doe\"
  }")

JOB_ID=$(echo $GRADE_RESPONSE | jq -r '.job_id')
echo "Job ID: $JOB_ID"

# 6. Poll for results
echo "Waiting for results..."
while true; do
  RESULT=$(curl -s http://localhost:8000/api/grading/results/$JOB_ID)
  STATUS=$(echo $RESULT | jq -r '.status')
  
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    echo "Final result:"
    echo $RESULT | jq '.'
    break
  fi
  
  sleep 2
done
```

---

## Error Responses

### 400 Bad Request

```json
{
  "detail": "File type not allowed. Allowed types: .pdf, .jpg, .jpeg, .png, .gif"
}
```

### 404 Not Found

```json
{
  "detail": "Rubric not found"
}
```

### 500 Internal Server Error

```json
{
  "detail": "Grading failed: OpenAI API key invalid"
}
```

---

## Rate Limits

No rate limits currently implemented. Add in production.

## Next Steps

- Explore interactive API docs: http://localhost:8000/docs
- Test with Postman or Insomnia
- Integrate with frontend application
- Add authentication for production use

