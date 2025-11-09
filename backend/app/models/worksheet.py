"""Worksheet model."""

from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class WorksheetStatus(str, enum.Enum):
    """Worksheet processing status."""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Worksheet(Base):
    """Worksheet uploaded by teacher."""
    
    __tablename__ = "worksheets"
    
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(String, index=True, nullable=True)  # For future auth
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, jpg, png
    status = Column(Enum(WorksheetStatus), default=WorksheetStatus.UPLOADED)
    subject = Column(String, nullable=True)  # math, english, science, etc.
    
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    questions = relationship("Question", back_populates="worksheet", cascade="all, delete-orphan")
    grades = relationship("Grade", back_populates="worksheet", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="worksheet", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Worksheet(id={self.id}, file_name={self.file_name}, status={self.status})>"

