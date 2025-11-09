"""File upload and management utilities."""

import os
import uuid
import shutil
import aiofiles
from pathlib import Path
from typing import BinaryIO
from fastapi import UploadFile
from loguru import logger
from app.config import settings


class FileHandler:
    """Handle file uploads and storage."""
    
    def __init__(self):
        self.upload_dir = Path(settings.upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (self.upload_dir / "worksheets").mkdir(exist_ok=True)
        (self.upload_dir / "rubrics").mkdir(exist_ok=True)
        (self.upload_dir / "student_work").mkdir(exist_ok=True)
    
    async def save_upload(
        self,
        file: UploadFile,
        category: str = "worksheets"
    ) -> tuple[str, str]:
        """
        Save uploaded file and return file path and unique ID.
        
        Args:
            file: FastAPI UploadFile object
            category: Subdirectory to save in (worksheets, rubrics, student_work)
            
        Returns:
            Tuple of (file_path, file_id)
        """
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        new_filename = f"{file_id}{file_extension}"
        
        # Determine save path
        save_dir = self.upload_dir / category
        file_path = save_dir / new_filename
        
        # Save file
        try:
            async with aiofiles.open(file_path, 'wb') as out_file:
                content = await file.read()
                
                # Check file size
                if len(content) > settings.max_file_size:
                    raise ValueError(f"File size exceeds maximum of {settings.max_file_size} bytes")
                
                await out_file.write(content)
            
            logger.info(f"Saved file: {file_path}")
            return str(file_path), file_id
            
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            raise
    
    def get_file_path(self, file_id: str, category: str = "worksheets") -> Path:
        """Get file path from file ID."""
        save_dir = self.upload_dir / category
        for file_path in save_dir.glob(f"{file_id}.*"):
            return file_path
        raise FileNotFoundError(f"File with ID {file_id} not found")
    
    def delete_file(self, file_path: str) -> bool:
        """Delete a file."""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                logger.info(f"Deleted file: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")
            return False


# Global file handler instance
file_handler = FileHandler()

