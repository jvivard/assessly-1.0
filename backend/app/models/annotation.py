"""Annotation model for storing grading comments."""

from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Annotation(Base):
    """Annotation/comment on a graded worksheet."""
    
    __tablename__ = "annotations"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(100), index=True, nullable=False)  # Grading job ID
    worksheet_id = Column(Integer, ForeignKey("worksheets.id"), nullable=True)
    
    # Annotation details
    annotation_id = Column(String(100), unique=True, index=True)  # Frontend ID
    question_id = Column(String(50))
    text = Column(Text)
    full_text = Column(Text, nullable=True)  # Full text if minimized
    
    # Position and size
    position_x = Column(Float)
    position_y = Column(Float)
    width = Column(Float)
    height = Column(Float)
    
    # Type and styling
    annotation_type = Column(String(50))  # feedback, score, checkmark, error
    color = Column(String(50))
    is_minimized = Column(Integer, default=0)  # SQLite doesn't have boolean
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    worksheet = relationship("Worksheet", back_populates="annotations")

