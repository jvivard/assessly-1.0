"""Initialize database with sample data."""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import Worksheet, Question, Rubric, Grade
from loguru import logger


def init_database():
    """Create all database tables."""
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully!")


def create_sample_data():
    """Create sample data for testing."""
    logger.info("Creating sample data...")
    
    db = SessionLocal()
    
    try:
        # Check if data already exists
        if db.query(Rubric).first():
            logger.info("Sample data already exists, skipping...")
            return
        
        # Create sample rubric
        sample_rubric = Rubric(
            name="Math Quiz 1 - Algebra",
            file_path="./samples/sample_rubric.pdf",
            subject="math",
            criteria_json={
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
                                "criteria": "Solve for x. Must show work.",
                                "partial_credit": "Award 3 points for correct method, 2 for answer"
                            },
                            {
                                "part": "B",
                                "points": 5,
                                "criteria": "Simplify the expression. Show all steps.",
                                "partial_credit": "Award 3 points for correct process"
                            }
                        ]
                    },
                    {
                        "number": 2,
                        "total_points": 10,
                        "parts": [
                            {
                                "part": None,
                                "points": 10,
                                "criteria": "Graph the equation. Label axes and show key points.",
                                "partial_credit": "Award 5 points for correct shape, 3 for labels, 2 for accuracy"
                            }
                        ]
                    }
                ]
            }
        )
        
        db.add(sample_rubric)
        db.commit()
        
        logger.info("Sample data created successfully!")
        
    except Exception as e:
        logger.error(f"Error creating sample data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("Initializing Assesly database...")
    init_database()
    create_sample_data()
    logger.info("Database initialization complete!")

