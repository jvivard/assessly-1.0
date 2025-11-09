"""API routes for Assesly."""

from fastapi import APIRouter
from app.api import upload, grading, websocket

api_router = APIRouter()

# Include all route modules
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(grading.router, prefix="/grading", tags=["grading"])

__all__ = ["api_router"]

