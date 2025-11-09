"""Main FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from loguru import logger
import sys
import os

from app.config import settings
from app.database import engine, Base
from app.api import api_router
from app.api.websocket import router as websocket_router
from app.utils.redis_client import redis_client


# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="INFO" if not settings.debug else "DEBUG"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting Assesly AI Grading Backend...")
    
    # Create database tables
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Connect to Redis
    logger.info("Connecting to Redis...")
    await redis_client.connect()
    
    logger.info("Application started successfully!")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await redis_client.disconnect()
    logger.info("Application stopped")


# Create FastAPI app
app = FastAPI(
    title="Assesly AI Grading API",
    description="AI-powered grading platform for student worksheets",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for static file serving
uploads_dir = settings.upload_dir
if os.path.exists(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
    logger.info(f"Mounted uploads directory: {uploads_dir}")
else:
    logger.warning(f"Uploads directory not found: {uploads_dir}")
    os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
    logger.info(f"Created and mounted uploads directory: {uploads_dir}")

# Include API routes
app.include_router(api_router, prefix="/api")
app.include_router(websocket_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Assesly AI Grading API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
        "redis": "connected" if redis_client.redis else "disconnected"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )

