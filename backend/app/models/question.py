"""Question model."""

from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base


class Question(Base):
    """Individual question from a worksheet."""
    
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    worksheet_id = Column(Integer, ForeignKey("worksheets.id"), nullable=False)
    
    question_number = Column(Integer, nullable=False)
    part = Column(String, nullable=True)  # A, B, C, D for multi-part questions
    text = Column(Text, nullable=False)
    max_points = Column(Float, nullable=False)
    
    # OCR extracted content
    extracted_text = Column(Text, nullable=True)
    
    # Relationships
    worksheet = relationship("Worksheet", back_populates="questions")
    grades = relationship("Grade", back_populates="question", cascade="all, delete-orphan")
    
    def __repr__(self):
        part_str = f"-{self.part}" if self.part else ""
        return f"<Question(id={self.id}, Q{self.question_number}{part_str}, {self.max_points}pts)>"

