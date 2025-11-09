"""Grading endpoints."""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from loguru import logger
import uuid
import os

from app.database import get_db
from app.models.worksheet import Worksheet, WorksheetStatus
from app.models.question import Question
from app.models.rubric import Rubric
from app.models.grade import Grade
from app.models.annotation import Annotation
from app.services.ocr_service import ocr_service
from app.services.grading_engine import grading_engine
from app.services.multi_question_grader import multi_question_grader
from app.services.student_extractor import student_extractor
from app.utils.redis_client import redis_client
from app.config import settings

router = APIRouter()


def file_path_to_url(file_path: str, base_url: str = "http://localhost:8000") -> str:
    """Convert local file path to accessible URL."""
    if not file_path:
        return ""
    
    # Normalize path separators
    file_path = file_path.replace('\\', '/')
    
    # Remove the upload directory prefix if present
    upload_dir = settings.upload_dir.rstrip('/').replace('\\', '/')
    
    if file_path.startswith(upload_dir):
        # Remove upload dir prefix: ./uploads/student_work/file.pdf -> student_work/file.pdf
        relative_path = file_path[len(upload_dir):].lstrip('/')
    elif file_path.startswith('./uploads/'):
        # Remove ./uploads/ prefix: ./uploads/student_work/file.pdf -> student_work/file.pdf
        relative_path = file_path[len('./uploads/'):].lstrip('/')
    elif file_path.startswith('uploads/'):
        # Remove uploads/ prefix: uploads/student_work/file.pdf -> student_work/file.pdf
        relative_path = file_path[len('uploads/'):].lstrip('/')
    elif '/' in file_path:
        # Has subdirectory, keep the path structure
        # E.g., student_work/file.pdf -> student_work/file.pdf
        relative_path = file_path
    else:
        # Just filename - assume it's in worksheets
        relative_path = f"worksheets/{file_path}"
    
    return f"{base_url}/uploads/{relative_path}"


class GradeRequest(BaseModel):
    """Request to grade student work."""
    question_file_path: str
    rubric_id: int
    student_work_file_path: str
    student_name: Optional[str] = None
    question_text: Optional[str] = None  # Optional: if not provided, will OCR from file
    subject: Optional[str] = None


class BulkGradeRequest(BaseModel):
    """Request to grade multiple student submissions."""
    worksheet_id: int
    rubric_id: int
    student_submissions: List[Dict[str, str]]  # [{"student_name": "...", "file_path": "..."}]


@router.post("/grade")
async def grade_submission(
    request: GradeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Grade a single student submission.
    
    Args:
        request: Grading request with file paths and rubric ID
        
    Returns:
        {
            "job_id": str,
            "status": "processing"
        }
    """
    try:
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Get rubric
        rubric = db.query(Rubric).filter(Rubric.id == request.rubric_id).first()
        if not rubric:
            raise HTTPException(status_code=404, detail="Rubric not found")
        
        # Start grading in background
        background_tasks.add_task(
            grade_single_submission_task,
            job_id,
            request,
            rubric,
            db
        )
        
        # Set initial status in Redis
        await redis_client.set_job_status(job_id, {
            "status": "processing",
            "progress": 0,
            "message": "Starting grading process..."
        })
        
        return {
            "job_id": job_id,
            "status": "processing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start grading: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grade-bulk")
async def grade_bulk_submissions(
    request: BulkGradeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Grade multiple student submissions for the same worksheet.
    
    Args:
        request: Bulk grading request
        
    Returns:
        {
            "job_id": str,
            "status": "processing",
            "total_submissions": int
        }
    """
    try:
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Validate worksheet and rubric exist
        worksheet = db.query(Worksheet).filter(Worksheet.id == request.worksheet_id).first()
        if not worksheet:
            raise HTTPException(status_code=404, detail="Worksheet not found")
        
        rubric = db.query(Rubric).filter(Rubric.id == request.rubric_id).first()
        if not rubric:
            raise HTTPException(status_code=404, detail="Rubric not found")
        
        # Start bulk grading in background
        background_tasks.add_task(
            grade_bulk_submissions_task,
            job_id,
            request,
            worksheet,
            rubric,
            db
        )
        
        # Set initial status
        await redis_client.set_job_status(job_id, {
            "status": "processing",
            "progress": 0,
            "total": len(request.student_submissions),
            "completed": 0,
            "message": "Starting bulk grading..."
        })
        
        return {
            "job_id": job_id,
            "status": "processing",
            "total_submissions": len(request.student_submissions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start bulk grading: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{job_id}")
async def get_grading_results(job_id: str, db: Session = Depends(get_db)):
    """
    Get grading results for a job.
    
    Args:
        job_id: Job ID returned from /grade endpoint
        
    Returns:
        {
            "status": "completed" | "processing" | "failed",
            "progress": int,
            "results": {...}
        }
    """
    try:
        # Get status from Redis
        status = await redis_client.get_job_status(job_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grades/worksheet/{worksheet_id}")
async def get_worksheet_grades(worksheet_id: int, db: Session = Depends(get_db)):
    """
    Get all grades for a specific worksheet.
    
    Args:
        worksheet_id: Worksheet ID
        
    Returns:
        List of all grades for the worksheet
    """
    try:
        grades = db.query(Grade).filter(Grade.worksheet_id == worksheet_id).all()
        
        results = []
        for grade in grades:
            results.append({
                "id": grade.id,
                "student_name": grade.student_name,
                "question_id": grade.question_id,
                "score": grade.score,
                "max_score": grade.max_score,
                "feedback": grade.feedback,
                "breakdown": grade.breakdown_json,
                "graded_at": grade.graded_at.isoformat()
            })
        
        return {
            "worksheet_id": worksheet_id,
            "total_grades": len(results),
            "grades": results
        }
        
    except Exception as e:
        logger.error(f"Failed to get worksheet grades: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Background task functions

async def grade_single_submission_task(
    job_id: str,
    request: GradeRequest,
    rubric: Rubric,
    db: Session
):
    """Background task to grade a single submission - NOW WITH FULL MULTI-QUESTION SUPPORT!"""
    try:
        # Update status
        await redis_client.set_job_status(job_id, {
            "status": "processing",
            "progress": 10,
            "message": "Analyzing worksheet structure..."
        })
        
        effective_subject = request.subject or rubric.subject or "general"
        
        # Update status
        await redis_client.set_job_status(job_id, {
            "status": "processing",
            "progress": 20,
            "message": "Extracting student details..."
        })
        
        # Extract student details from the first page
        logger.info(f"Extracting student details for job {job_id}")
        # For PDF, we need to extract the first page as an image and OCR text
        import os
        from pdf2image import convert_from_path
        from app.services.ocr_service import ocr_service
        
        student_details = {"name": None, "registration_number": None, "class_section": None, "subject": None}
        first_page_ocr_text = None
        
        if request.student_work_file_path.lower().endswith('.pdf'):
            try:
                # Convert first page to image for student extraction
                images = convert_from_path(request.student_work_file_path, dpi=150, first_page=1, last_page=1)
                if images:
                    temp_first_page = "/tmp/first_page_student.jpg"
                    images[0].save(temp_first_page, 'JPEG')
                    
                    # Extract OCR text from first page first (for faster student extraction)
                    ocr_result = await ocr_service.extract_text_with_smart_fallback(
                        temp_first_page,
                        subject=effective_subject
                    )
                    first_page_ocr_text = ocr_result.get('text', '')
                    
                    # Extract student details using both OCR text and image
                    student_details = await student_extractor.extract_student_details(
                        temp_first_page,
                        ocr_text=first_page_ocr_text
                    )
                    os.remove(temp_first_page)
            except Exception as e:
                logger.warning(f"Failed to extract student details: {e}")
        else:
            # For images, extract OCR text first, then student details
            try:
                # Extract OCR text
                ocr_result = await ocr_service.extract_text_with_smart_fallback(
                    request.student_work_file_path,
                    subject=effective_subject
                )
                first_page_ocr_text = ocr_result.get('text', '')
                
                # Extract student details using both OCR text and image
                student_details = await student_extractor.extract_student_details(
                    request.student_work_file_path,
                    ocr_text=first_page_ocr_text
                )
            except Exception as e:
                logger.warning(f"Failed to extract student details: {e}")
        
        logger.info(f"Student details: {student_details}")
        
        # Update status with student details immediately (so frontend can display them)
        # Store student details in a base results object that will be merged with full results later
        student_results = {
            "student_name": student_details.get("name"),
            "registration_number": student_details.get("registration_number"),
            "class_section": student_details.get("class_section"),
            "subject": student_details.get("subject") or effective_subject
        }
        
        await redis_client.set_job_status(job_id, {
            "status": "processing",
            "progress": 30,
            "message": "Extracting all questions from worksheet...",
            "results": student_results
        })
        
        # Use multi-question grader to grade ALL questions
        logger.info(f"Starting multi-question grading for job {job_id}")
        full_results = await multi_question_grader.extract_and_grade_all_questions(
            worksheet_path=request.student_work_file_path,
            rubric_criteria=rubric.criteria_json,
            subject=effective_subject,
            job_id=job_id,
            redis_client=redis_client,
            student_name=student_details.get("name"),
            registration_number=student_details.get("registration_number")
        )
        
        # Add student details to results
        full_results["student_name"] = student_details.get("name")
        full_results["registration_number"] = student_details.get("registration_number")
        full_results["class_section"] = student_details.get("class_section")
        full_results["subject"] = student_details.get("subject")
        full_results["job_id"] = job_id
        
        logger.info(f"Multi-question grading completed: {full_results['total_score']}/{full_results['total_max_points']}")
        
        # Update status with COMPLETE results (includes all questions + student details)
        await redis_client.set_job_status(job_id, {
            "status": "completed",
            "progress": 100,
            "message": "All questions graded!",
            "results": full_results,  # Now includes ALL questions + student details!
            "worksheet_image_url": file_path_to_url(request.student_work_file_path),
            "question_image_url": file_path_to_url(request.question_file_path)
        })
        
        logger.info(f"Grading job {job_id} completed: {len(full_results['questions'])} questions graded")
        
    except Exception as e:
        logger.error(f"Grading job {job_id} failed: {e}")
        await redis_client.set_job_status(job_id, {
            "status": "failed",
            "progress": 0,
            "message": f"Grading failed: {str(e)}"
        })


async def grade_bulk_submissions_task(
    job_id: str,
    request: BulkGradeRequest,
    worksheet: Worksheet,
    rubric: Rubric,
    db: Session
):
    """Background task to grade multiple submissions."""
    try:
        total = len(request.student_submissions)
        completed = 0
        results = []
        
        for submission in request.student_submissions:
            # Update progress
            progress = int((completed / total) * 100)
            await redis_client.set_job_status(job_id, {
                "status": "processing",
                "progress": progress,
                "total": total,
                "completed": completed,
                "message": f"Grading {submission.get('student_name', 'Unknown')}..."
            })
            
            # Grade this submission
            # (Simplified - in production, would handle multiple questions)
            student_work_text = await ocr_service.extract_text(
                submission["file_path"],
                subject=rubric.subject
            )
            
            first_question = rubric.criteria_json.get("questions", [{}])[0]
            max_points = first_question.get("total_points", 10)
            
            grading_result = await grading_engine.grade_question(
                question_text="",  # Would need question text
                rubric_criteria=first_question,
                student_work=student_work_text,
                max_points=max_points,
                subject=rubric.subject or "general",
                student_work_image_path=submission["file_path"]
            )
            
            results.append({
                "student_name": submission.get("student_name"),
                "grade": grading_result
            })
            
            completed += 1
        
        # Final status
        await redis_client.set_job_status(job_id, {
            "status": "completed",
            "progress": 100,
            "total": total,
            "completed": completed,
            "message": "All submissions graded!",
            "results": results
        })
        
        logger.info(f"Bulk grading job {job_id} completed: {completed}/{total} submissions")
        
    except Exception as e:
        logger.error(f"Bulk grading job {job_id} failed: {e}")
        await redis_client.set_job_status(job_id, {
            "status": "failed",
            "message": f"Bulk grading failed: {str(e)}"
        })


class AnnotationData(BaseModel):
    """Annotation data from frontend."""
    id: str
    questionId: str
    text: str
    fullText: Optional[str] = None
    position: Dict[str, float]  # {x, y}
    size: Dict[str, float]  # {width, height}
    type: str  # feedback, score, checkmark, error
    color: str
    isMinimized: Optional[bool] = False


class SaveAnnotationsRequest(BaseModel):
    """Request to save annotations."""
    job_id: str
    worksheet_id: Optional[int] = None
    annotations: List[AnnotationData]


@router.post("/annotations/save")
async def save_annotations(
    request: SaveAnnotationsRequest,
    db: Session = Depends(get_db)
):
    """
    Save annotations for a graded worksheet.
    
    Args:
        request: Annotations data with job_id
        
    Returns:
        Status of save operation
    """
    try:
        # Delete existing annotations for this job_id
        db.query(Annotation).filter(Annotation.job_id == request.job_id).delete()
        
        # Save new annotations
        for ann_data in request.annotations:
            annotation = Annotation(
                job_id=request.job_id,
                worksheet_id=request.worksheet_id,
                annotation_id=ann_data.id,
                question_id=ann_data.questionId,
                text=ann_data.text,
                full_text=ann_data.fullText,
                position_x=ann_data.position["x"],
                position_y=ann_data.position["y"],
                width=ann_data.size["width"],
                height=ann_data.size["height"],
                annotation_type=ann_data.type,
                color=ann_data.color,
                is_minimized=1 if ann_data.isMinimized else 0
            )
            db.add(annotation)
        
        db.commit()
        
        logger.info(f"Saved {len(request.annotations)} annotations for job {request.job_id}")
        
        return {
            "status": "success",
            "saved_count": len(request.annotations),
            "job_id": request.job_id
        }
        
    except Exception as e:
        logger.error(f"Failed to save annotations: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save annotations: {str(e)}")


@router.get("/annotations/{job_id}")
async def get_annotations(
    job_id: str,
    db: Session = Depends(get_db)
):
    """
    Get saved annotations for a job.
    
    Args:
        job_id: Grading job ID
        
    Returns:
        List of annotations
    """
    try:
        annotations = db.query(Annotation).filter(Annotation.job_id == job_id).all()
        
        return {
            "job_id": job_id,
            "annotations": [
                {
                    "id": ann.annotation_id,
                    "questionId": ann.question_id,
                    "text": ann.text,
                    "fullText": ann.full_text,
                    "position": {"x": ann.position_x, "y": ann.position_y},
                    "size": {"width": ann.width, "height": ann.height},
                    "type": ann.annotation_type,
                    "color": ann.color,
                    "isMinimized": ann.is_minimized == 1
                }
                for ann in annotations
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get annotations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class CompleteGradingRequest(BaseModel):
    """Request to mark grading as complete and save to database."""
    job_id: str


@router.post("/complete")
async def complete_grading(
    request: CompleteGradingRequest,
    db: Session = Depends(get_db)
):
    """
    Mark grading as complete and save results to database.
    
    Args:
        request: Job ID to complete
        
    Returns:
        Saved grade information
    """
    try:
        # Get grading results from Redis
        results = await redis_client.get_job_status(request.job_id)
        
        if not results:
            raise HTTPException(status_code=404, detail="Grading results not found")
        
        if results.get("status") != "completed":
            raise HTTPException(status_code=400, detail="Grading not yet completed")
        
        grading_data = results.get("results", {})
        
        # Check for duplicates before saving
        # First, check by job_id (most reliable - same grading job)
        existing_grade_by_job = db.query(Grade).filter(
            Grade.job_id == request.job_id
        ).first()
        
        if existing_grade_by_job:
            logger.info(f"Duplicate found: Grade already exists for job {request.job_id} (Grade ID: {existing_grade_by_job.id})")
            return {
                "status": "duplicate",
                "message": "This grading has already been saved to classes",
                "grade_id": existing_grade_by_job.id,
                "student_name": existing_grade_by_job.student_name,
                "class_section": existing_grade_by_job.class_section,
                "subject": existing_grade_by_job.subject,
                "score": existing_grade_by_job.score,
                "max_score": existing_grade_by_job.max_score,
                "percentage": round((existing_grade_by_job.score / existing_grade_by_job.max_score) * 100) if existing_grade_by_job.max_score > 0 else 0,
                "is_duplicate": True
            }
        
        # Also check by registration_number + class_section + subject combination
        # (in case same student work was graded multiple times with different job_ids)
        registration_number = grading_data.get("registration_number")
        class_section = grading_data.get("class_section")
        subject = grading_data.get("subject")
        student_name = grading_data.get("student_name")
        
        if registration_number and class_section and subject:
            existing_grade_by_student = db.query(Grade).filter(
                Grade.registration_number == registration_number,
                Grade.class_section == class_section,
                Grade.subject == subject,
                # Also check if the worksheet path matches (same work file)
                Grade.student_work_path == results.get("worksheet_image_url", "")
            ).first()
            
            if existing_grade_by_student:
                logger.info(f"Duplicate found: Grade already exists for student {registration_number} in {class_section} - {subject} (Grade ID: {existing_grade_by_student.id})")
                return {
                    "status": "duplicate",
                    "message": f"Grade for {student_name or registration_number} in {class_section} - {subject} already exists in classes",
                    "grade_id": existing_grade_by_student.id,
                    "student_name": existing_grade_by_student.student_name,
                    "class_section": existing_grade_by_student.class_section,
                    "subject": existing_grade_by_student.subject,
                    "score": existing_grade_by_student.score,
                    "max_score": existing_grade_by_student.max_score,
                    "percentage": round((existing_grade_by_student.score / existing_grade_by_student.max_score) * 100) if existing_grade_by_student.max_score > 0 else 0,
                    "is_duplicate": True
                }
        
        # No duplicate found - proceed with saving
        # Create or update worksheet
        worksheet_path = results.get("worksheet_image_url", "")
        worksheet = Worksheet(
            file_path=worksheet_path,
            file_name=worksheet_path.split("/")[-1] if worksheet_path else "unknown.pdf",
            file_type="pdf",
            status=WorksheetStatus.COMPLETED
        )
        db.add(worksheet)
        db.flush()
        
        # Create question (simplified - one per worksheet for now)
        question = Question(
            worksheet_id=worksheet.id,
            question_number=1,
            text="Multiple questions",
            max_points=grading_data.get("total_max_points", 0)
        )
        db.add(question)
        db.flush()
        
        # Create grade entry
        grade = Grade(
            worksheet_id=worksheet.id,
            question_id=question.id,
            student_name=student_name,
            registration_number=registration_number,
            class_section=class_section,
            subject=subject,
            student_work_path=worksheet_path,
            job_id=request.job_id,
            score=grading_data.get("total_score", 0),
            max_score=grading_data.get("total_max_points", 0),
            feedback=f"Overall: {grading_data.get('percentage', 0)}%",
            breakdown_json=grading_data
        )
        db.add(grade)
        db.commit()
        
        logger.info(f"Saved grading results for job {request.job_id} to database (Grade ID: {grade.id})")
        
        return {
            "status": "success",
            "message": f"Grading saved to classes: {class_section} - {subject}",
            "grade_id": grade.id,
            "student_name": grade.student_name,
            "class_section": grade.class_section,
            "subject": grade.subject,
            "score": grade.score,
            "max_score": grade.max_score,
            "percentage": grading_data.get("percentage", 0),
            "is_duplicate": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to complete grading: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save grading: {str(e)}")


@router.get("/classes")
async def get_classes(
    db: Session = Depends(get_db)
):
    """
    Get all grades organized by class and subject.
    
    Returns:
        Dictionary organized by class section and subject
    """
    try:
        grades = db.query(Grade).all()
        
        # Organize by class and subject
        classes_data = {}
        
        for grade in grades:
            class_section = grade.class_section or "Unassigned"
            subject = grade.subject or "General"
            
            if class_section not in classes_data:
                classes_data[class_section] = {}
            
            if subject not in classes_data[class_section]:
                classes_data[class_section][subject] = {
                    "total_students": 0,
                    "average_score": 0,
                    "total_score": 0,
                    "total_max_score": 0,
                    "grades": []
                }
            
            subject_data = classes_data[class_section][subject]
            subject_data["total_students"] += 1
            subject_data["total_score"] += grade.score
            subject_data["total_max_score"] += grade.max_score
            subject_data["grades"].append({
                "id": grade.id,
                "student_name": grade.student_name,
                "registration_number": grade.registration_number,
                "score": grade.score,
                "max_score": grade.max_score,
                "percentage": round((grade.score / grade.max_score) * 100) if grade.max_score > 0 else 0,
                "graded_at": grade.graded_at.isoformat() if grade.graded_at else None,
                "job_id": grade.job_id
            })
        
        # Calculate averages
        for class_section in classes_data:
            for subject in classes_data[class_section]:
                subject_data = classes_data[class_section][subject]
                if subject_data["total_max_score"] > 0:
                    subject_data["average_score"] = round(
                        (subject_data["total_score"] / subject_data["total_max_score"]) * 100
                    )
        
        return classes_data
        
    except Exception as e:
        logger.error(f"Failed to get classes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classes/{class_section}/{subject}")
async def get_class_grades(
    class_section: str,
    subject: str,
    db: Session = Depends(get_db)
):
    """
    Get all grades for a specific class and subject.
    
    Args:
        class_section: Class section (e.g., "SEC-A")
        subject: Subject name
        
    Returns:
        List of grades for that class/subject
    """
    try:
        grades = db.query(Grade).filter(
            Grade.class_section == class_section,
            Grade.subject == subject
        ).all()
        
        return {
            "class_section": class_section,
            "subject": subject,
            "total_students": len(grades),
            "grades": [
                {
                    "id": grade.id,
                    "student_name": grade.student_name,
                    "registration_number": grade.registration_number,
                    "score": grade.score,
                    "max_score": grade.max_score,
                    "percentage": round((grade.score / grade.max_score) * 100) if grade.max_score > 0 else 0,
                    "graded_at": grade.graded_at.isoformat() if grade.graded_at else None,
                    "job_id": grade.job_id,
                    "feedback": grade.feedback,
                    "breakdown": grade.breakdown_json
                }
                for grade in grades
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get class grades: {e}")
        raise HTTPException(status_code=500, detail=str(e))

