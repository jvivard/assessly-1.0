"""Celery worker for async grading tasks."""

from celery import Celery
from loguru import logger
import sys

from app.config import settings

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan> - <level>{message}</level>",
    level="INFO"
)

# Create Celery app
celery_app = Celery(
    "assesly_grading",
    broker=settings.redis_url,
    backend=settings.redis_url
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes max per task
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks
)


@celery_app.task(name="grade_submission")
def grade_submission_task(
    job_id: str,
    question_file_path: str,
    rubric_id: int,
    student_work_file_path: str,
    student_name: str = None
):
    """
    Celery task to grade a student submission.
    
    This allows grading to be processed asynchronously and distributed
    across multiple workers for better scalability.
    """
    from app.database import SessionLocal
    from app.models.rubric import Rubric
    from app.services.ocr_service import ocr_service
    from app.services.grading_engine import grading_engine
    import asyncio
    
    logger.info(f"Starting grading task {job_id}")
    
    db = SessionLocal()
    
    try:
        # Get rubric
        rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
        if not rubric:
            raise ValueError(f"Rubric {rubric_id} not found")
        
        # Run async operations in event loop
        loop = asyncio.get_event_loop()
        
        # Extract student work
        logger.info(f"Extracting student work from {student_work_file_path}")
        student_work_text = loop.run_until_complete(
            ocr_service.extract_text(student_work_file_path, subject=rubric.subject)
        )
        
        # Extract question text
        logger.info(f"Extracting question from {question_file_path}")
        question_text = loop.run_until_complete(
            ocr_service.extract_text(question_file_path, subject=rubric.subject)
        )
        
        # Grade the submission
        first_question = rubric.criteria_json.get("questions", [{}])[0]
        max_points = first_question.get("total_points", 10)
        
        logger.info(f"Grading submission for {student_name or 'Unknown'}")
        grading_result = loop.run_until_complete(
            grading_engine.grade_question(
                question_text=question_text,
                rubric_criteria=first_question,
                student_work=student_work_text,
                max_points=max_points,
                subject=rubric.subject or "general",
                student_work_image_path=student_work_file_path
            )
        )
        
        logger.info(f"Grading task {job_id} completed: {grading_result['score']}/{max_points}")
        
        return {
            "status": "completed",
            "job_id": job_id,
            "student_name": student_name,
            "results": grading_result
        }
        
    except Exception as e:
        logger.error(f"Grading task {job_id} failed: {e}")
        return {
            "status": "failed",
            "job_id": job_id,
            "error": str(e)
        }
    finally:
        db.close()


@celery_app.task(name="grade_bulk_submissions")
def grade_bulk_submissions_task(
    job_id: str,
    worksheet_id: int,
    rubric_id: int,
    student_submissions: list
):
    """
    Celery task to grade multiple submissions in bulk.
    """
    from app.database import SessionLocal
    from app.models.worksheet import Worksheet
    from app.models.rubric import Rubric
    from app.services.ocr_service import ocr_service
    from app.services.grading_engine import grading_engine
    import asyncio
    
    logger.info(f"Starting bulk grading task {job_id} for {len(student_submissions)} submissions")
    
    db = SessionLocal()
    results = []
    
    try:
        # Get worksheet and rubric
        worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
        rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
        
        if not worksheet or not rubric:
            raise ValueError("Worksheet or rubric not found")
        
        loop = asyncio.get_event_loop()
        
        for i, submission in enumerate(student_submissions):
            logger.info(f"Processing submission {i+1}/{len(student_submissions)}")
            
            # Extract and grade
            student_work_text = loop.run_until_complete(
                ocr_service.extract_text(submission["file_path"], subject=rubric.subject)
            )
            
            first_question = rubric.criteria_json.get("questions", [{}])[0]
            max_points = first_question.get("total_points", 10)
            
            grading_result = loop.run_until_complete(
                grading_engine.grade_question(
                    question_text="",
                    rubric_criteria=first_question,
                    student_work=student_work_text,
                    max_points=max_points,
                    subject=rubric.subject or "general",
                    student_work_image_path=submission["file_path"]
                )
            )
            
            results.append({
                "student_name": submission.get("student_name"),
                "grade": grading_result
            })
        
        logger.info(f"Bulk grading task {job_id} completed: {len(results)} submissions graded")
        
        return {
            "status": "completed",
            "job_id": job_id,
            "total": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Bulk grading task {job_id} failed: {e}")
        return {
            "status": "failed",
            "job_id": job_id,
            "error": str(e)
        }
    finally:
        db.close()


if __name__ == "__main__":
    # Start Celery worker
    celery_app.start()

