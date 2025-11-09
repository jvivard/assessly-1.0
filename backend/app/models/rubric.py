"""Rubric model."""

from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Rubric(Base):
    """Grading rubric uploaded by teacher."""
    
    __tablename__ = "rubrics"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    
    # Parsed rubric structure as JSON
    # Example: {
    #   "questions": [
    #     {
    #       "number": 1,
    #       "parts": [
    #         {"part": "A", "points": 2, "criteria": "Must show work"},
    #         {"part": "B", "points": 3, "criteria": "Correct answer with units"}
    #       ]
    #     }
    #   ]
    # }
    criteria_json = Column(JSON, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Rubric(id={self.id}, name={self.name})>"

