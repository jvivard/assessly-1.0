FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads and logs directories
RUN mkdir -p /app/uploads/worksheets /app/uploads/rubrics /app/uploads/student_work
RUN mkdir -p /app/logs/extracted_text

# Cloud Run requires listening on the PORT environment variable
# PORT will be set by Cloud Run automatically
ENV PORT=8000
EXPOSE 8000

# Use PORT environment variable for Cloud Run compatibility
# Cloud Run sets PORT automatically, but we default to 8000 for local development
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

