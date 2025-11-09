"""Utility for saving extracted text to log files."""

import os
from pathlib import Path
from datetime import datetime
from loguru import logger
from typing import Optional
import re


def sanitize_filename(name: str) -> str:
    """Sanitize a string to be used as a filename."""
    if not name:
        return "unknown"
    # Remove invalid characters for filenames
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    # Remove leading/trailing spaces and dots
    name = name.strip('. ')
    # Limit length
    if len(name) > 100:
        name = name[:100]
    # If empty after sanitization, use default
    if not name:
        return "unknown"
    return name


def save_extracted_text_log(
    text: str,
    student_name: Optional[str] = None,
    registration_number: Optional[str] = None,
    job_id: Optional[str] = None,
    log_dir: str = "./logs/extracted_text"
) -> str:
    """
    Save extracted text to a log file.
    
    Args:
        text: The extracted text to save
        student_name: Student name (used in filename)
        registration_number: Registration number (used in filename)
        job_id: Job ID (used in filename if name/reg not available)
        log_dir: Directory to save logs
        
    Returns:
        Path to the saved log file
    """
    try:
        # Use backend/logs/extracted_text as default, or provided log_dir
        if log_dir is None:
            # Try to get from config, or use default
            try:
                from app.config import settings
                log_dir = str(Path(settings.upload_dir).parent / "logs" / "extracted_text")
            except:
                log_dir = "./logs/extracted_text"
        
        # Create logs directory if it doesn't exist
        log_path = Path(log_dir)
        log_path.mkdir(parents=True, exist_ok=True)
        
        # Generate filename
        if student_name:
            filename_base = sanitize_filename(student_name)
        elif registration_number:
            filename_base = f"RegNo_{sanitize_filename(registration_number)}"
        elif job_id:
            filename_base = f"Job_{job_id}"
        else:
            filename_base = f"Unknown_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Add timestamp and registration number if available
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        if registration_number and student_name:
            # Both available: Name_RegNo_TIMESTAMP.txt
            filename = f"{filename_base}_RegNo_{sanitize_filename(registration_number)}_{timestamp}.txt"
        elif registration_number:
            # Only registration: RegNo_XXX_TIMESTAMP.txt
            filename = f"{filename_base}_{timestamp}.txt"
        else:
            # Only name or job_id: Name_TIMESTAMP.txt or Job_ID_TIMESTAMP.txt
            filename = f"{filename_base}_{timestamp}.txt"
        
        filepath = log_path / filename
        
        # Write text to file
        with open(filepath, 'w', encoding='utf-8') as f:
            # Write header
            f.write("=" * 80 + "\n")
            f.write("EXTRACTED TEXT LOG\n")
            f.write("=" * 80 + "\n")
            f.write(f"Student Name: {student_name or 'Not found'}\n")
            f.write(f"Registration Number: {registration_number or 'Not found'}\n")
            f.write(f"Job ID: {job_id or 'Not found'}\n")
            f.write(f"Extracted At: {datetime.now().isoformat()}\n")
            f.write("=" * 80 + "\n\n")
            
            # Write extracted text
            f.write(text)
        
        logger.info(f"💾 Saved extracted text to: {filepath}")
        return str(filepath)
        
    except Exception as e:
        logger.error(f"Failed to save extracted text log: {e}")
        return ""


def format_table_text(text: str) -> str:
    """
    Attempt to format table-like text for better readability.
    
    Args:
        text: Raw extracted text that may contain tables
        
    Returns:
        Formatted text with improved table structure
    """
    lines = text.split('\n')
    formatted_lines = []
    
    for line in lines:
        # Detect table-like patterns (multiple columns separated by |, tabs, or multiple spaces)
        if '|' in line:
            # Pipe-separated table
            formatted_lines.append(line)
        elif '\t' in line:
            # Tab-separated table
            formatted_lines.append(line)
        elif re.match(r'^[\w\s]+\s{2,}[\w\s]+', line):
            # Multiple spaces (potential table)
            # Try to align columns
            parts = re.split(r'\s{2,}', line)
            if len(parts) > 1:
                # Format as pipe-separated for readability
                formatted_lines.append(' | '.join(part.strip() for part in parts))
            else:
                formatted_lines.append(line)
        else:
            formatted_lines.append(line)
    
    return '\n'.join(formatted_lines)

