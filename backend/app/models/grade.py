"""Grade model."""

from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Grade(Base):
    """Grading result for a student's answer."""
    
    __tablename__ = "grades"
    
    id = Column(Integer, primary_key=True, index=True)
    worksheet_id = Column(Integer, ForeignKey("worksheets.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    
    student_name = Column(String, nullable=True)
    registration_number = Column(String, nullable=True)
    class_section = Column(String, nullable=True)  # e.g., "SEC-A", "SEC-B"
    subject = Column(String, nullable=True)  # e.g., "Operating Systems", "Mathematics"
    student_work_path = Column(String, nullable=True)  # Path to student's work image/pdf
    job_id = Column(String, nullable=True, index=True)  # Job ID for tracking
    
    score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    feedback = Column(Text, nullable=False)
    
    # Detailed breakdown for multi-part questions
    # Example: {"A": {"score": 2, "max": 2, "feedback": "..."}, "B": {...}}
    breakdown_json = Column(JSON, nullable=True)
    
    graded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    worksheet = relationship("Worksheet", back_populates="grades")
    question = relationship("Question", back_populates="grades")
    
    def __repr__(self):
        return f"<Grade(id={self.id}, score={self.score}/{self.max_score})>"

