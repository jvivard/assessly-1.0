FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (bash is needed for startup script)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    poppler-utils \
    bash \
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

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Cloud Run requires listening on the PORT environment variable
# PORT will be set by Cloud Run automatically
ENV PORT=8000
EXPOSE 8000

# Use startup script to handle PORT variable (use bash explicitly)
CMD ["/bin/bash", "/app/start.sh"]

