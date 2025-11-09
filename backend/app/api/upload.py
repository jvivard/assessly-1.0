"""File upload endpoints."""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
from loguru import logger

from app.database import get_db
from app.models.worksheet import Worksheet, WorksheetStatus
from app.models.rubric import Rubric
from app.utils.file_handler import file_handler
from app.services.rubric_parser import rubric_parser
from pydantic import BaseModel

router = APIRouter()


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    file_type: str = "worksheet",  # worksheet, rubric, student_work
    subject: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Upload a file (worksheet, rubric, or student work).
    
    Args:
        file: The file to upload
        file_type: Type of file (worksheet, rubric, student_work)
        subject: Subject area (optional)
        
    Returns:
        {
            "file_id": str,
            "status": "uploaded",
            "file_name": str,
            "file_path": str
        }
    """
    try:
        # Validate file type
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif']
        file_extension = '.' + file.filename.split('.')[-1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Determine category for storage
        category_map = {
            "worksheet": "worksheets",
            "rubric": "rubrics",
            "student_work": "student_work"
        }
        category = category_map.get(file_type, "worksheets")
        
        # Save file
        file_path, file_id = await file_handler.save_upload(file, category)
        
        logger.info(f"File uploaded: {file.filename} -> {file_path}")
        
        # Create database record based on file type
        if file_type == "worksheet":
            worksheet = Worksheet(
                teacher_id=None,  # TODO: Add authentication
                file_path=file_path,
                file_name=file.filename,
                file_type=file_extension[1:],
                status=WorksheetStatus.UPLOADED,
                subject=subject
            )
            db.add(worksheet)
            db.commit()
            db.refresh(worksheet)
            
            return {
                "file_id": file_id,
                "worksheet_id": worksheet.id,
                "status": "uploaded",
                "file_name": file.filename,
                "file_path": file_path
            }
        
        else:
            # For rubrics and student work, just return file info
            return {
                "file_id": file_id,
                "status": "uploaded",
                "file_name": file.filename,
                "file_path": file_path,
                "file_type": file_type
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


class ParseRubricRequest(BaseModel):
    file_path: str
    name: str
    subject: Optional[str] = None


@router.post("/parse-rubric")
async def parse_rubric_endpoint(
    payload: ParseRubricRequest,
    db: Session = Depends(get_db)
):
    """
    Parse a rubric file into structured JSON format.
    
    Args:
        file_path: Path to the uploaded rubric file
        name: Name/title for the rubric
        subject: Subject area
        
    Returns:
        {
            "rubric_id": int,
            "name": str,
            "subject": str,
            "criteria": dict,
            "status": "parsed"
        }
    """
    try:
        logger.info(f"Parsing rubric: {payload.file_path}")
        
        # Parse rubric using AI
        criteria_json = await rubric_parser.parse_rubric(payload.file_path)
        
        # If subject not provided, try to extract from parsed rubric
        subject = payload.subject
        if not subject and "subject" in criteria_json:
            subject = criteria_json["subject"]
        
        # Save to database
        rubric = Rubric(
            name=payload.name,
            file_path=payload.file_path,
            subject=subject,
            criteria_json=criteria_json
        )
        db.add(rubric)
        db.commit()
        db.refresh(rubric)
        
        logger.info(f"Rubric parsed and saved: ID {rubric.id}")
        
        return {
            "rubric_id": rubric.id,
            "name": rubric.name,
            "subject": rubric.subject,
            "criteria": criteria_json,
            "status": "parsed"
        }
        
    except Exception as e:
        logger.error(f"Rubric parsing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Rubric parsing failed: {str(e)}")


@router.get("/rubrics")
async def list_rubrics(db: Session = Depends(get_db)):
    """
    List all available rubrics.
    
    Returns:
        List of rubric objects
    """
    try:
        rubrics = db.query(Rubric).order_by(Rubric.created_at.desc()).all()
        
        return {
            "rubrics": [
                {
                    "id": r.id,
                    "name": r.name,
                    "subject": r.subject,
                    "created_at": r.created_at.isoformat()
                }
                for r in rubrics
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to list rubrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rubrics/{rubric_id}")
async def get_rubric(rubric_id: int, db: Session = Depends(get_db)):
    """
    Get details of a specific rubric.
    
    Args:
        rubric_id: ID of the rubric
        
    Returns:
        Rubric details with full criteria
    """
    try:
        rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
        
        if not rubric:
            raise HTTPException(status_code=404, detail="Rubric not found")
        
        return {
            "id": rubric.id,
            "name": rubric.name,
            "subject": rubric.subject,
            "criteria": rubric.criteria_json,
            "created_at": rubric.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get rubric: {e}")
        raise HTTPException(status_code=500, detail=str(e))

