"""Student details extractor using Gemini."""

import re
import google.generativeai as genai
from loguru import logger
from typing import Dict, Optional

from app.config import settings


class StudentExtractor:
    """Extract student name and registration number from worksheet images."""
    
    def __init__(self):
        # Initialize Gemini only if API key is provided (optional)
        self.gemini_available = False
        if settings.gemini_api_key and settings.gemini_api_key.strip():
            try:
                genai.configure(api_key=settings.gemini_api_key)
                self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
                self.gemini_available = True
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini for student extraction: {e}")
                self.gemini_available = False
        else:
            logger.debug("Gemini API key not provided for student extraction")
    
    async def extract_student_details(self, image_path: str, ocr_text: Optional[str] = None) -> Dict[str, Optional[str]]:
        """
        Extract student details, class, and subject from worksheet image.
        First tries to parse from OCR text (if provided), then falls back to Gemini Vision.
        
        Args:
            image_path: Path to the first page of the worksheet
            ocr_text: Optional OCR extracted text from the first page (for faster extraction)
            
        Returns:
            Dictionary with 'name', 'registration_number', 'class_section', and 'subject' keys
        """
        student_details = {
            "name": None,
            "registration_number": None,
            "class_section": None,
            "subject": None
        }
        
        # First, try to extract from OCR text if provided (faster and free)
        if ocr_text:
            logger.info("Attempting to extract student details from OCR text...")
            ocr_details = self._extract_from_ocr_text(ocr_text)
            # Use OCR details if we found at least name or registration
            if ocr_details.get("name") or ocr_details.get("registration_number"):
                logger.info(f"Extracted from OCR text: {ocr_details}")
                student_details.update(ocr_details)
                # If we got everything, return early
                if all(student_details.values()):
                    return student_details
        
        # Fall back to Gemini Vision if OCR didn't find everything AND Gemini is available
        if self.gemini_available:
            try:
                # Read image
                with open(image_path, 'rb') as image_file:
                    image_data = image_file.read()
                
                # Create prompt for Gemini
                prompt = """
                Analyze this student worksheet image and extract the following information:
                1. Student Name (full name as written)
                2. Registration Number (also look for "Log No", "Reg No", "Roll No", "ID", etc.)
                3. Class/Section (like "A", "B", "C", "SEC-A", "Section A", "SEC-C", "CSE", etc.)
                4. Subject (like "Operating Systems", "Mathematics", "Computer Science", "O.S.", etc.)
                
                Look for these details typically at the top of the worksheet.
                Common patterns:
                - Name: [text after "Name:", "Name", etc.]
                - Registration: [digits after "Log No", "Reg No", "Registration", "Roll No", etc.]
                - Class: [text after "Section", "Class", "SEC-", etc.]
                - Subject: [text after "Subject:", "Assignment", course name, etc.]
                
                Respond in this exact format:
                Name: [student name or "Not found"]
                Registration: [registration number or "Not found"]
                Class: [class/section or "Not found"]
                Subject: [subject name or "Not found"]
                
                Be precise and only extract what you clearly see in the image.
                """
                
                # Upload image and get response from Gemini
                response = self.model.generate_content(
                    [prompt, {"mime_type": "image/jpeg", "data": image_data}],
                    generation_config={
                        "temperature": 0.1,
                        "max_output_tokens": 512,
                    }
                )
                
                response_text = response.text
                logger.info(f"Gemini response for student extraction: {response_text}")
                
                # Parse Gemini response
                gemini_details = self._parse_response(response_text)
                
                # Merge: use Gemini details to fill in missing fields
                for key in student_details:
                    if not student_details[key] and gemini_details.get(key):
                        student_details[key] = gemini_details[key]
                
                logger.info(f"Final extracted student details: {student_details}")
                return student_details
                
            except Exception as e:
                logger.warning(f"Failed to extract student details from Gemini: {e}. Using OCR results only.")
                # Return what we got from OCR
                return student_details
        else:
            logger.debug("Gemini not available for student extraction, using OCR results only")
            # Return what we got from OCR
            return student_details
    
    def _extract_from_ocr_text(self, text: str) -> Dict[str, Optional[str]]:
        """Extract student details directly from OCR text."""
        details = {
            "name": None,
            "registration_number": None,
            "class_section": None,
            "subject": None
        }
        
        # Extract name (look for "Name:", "Name", etc.)
        # Handle patterns like "Name: ___ Kushagan School" or "Name: Kushagan School"
        name_patterns = [
            r'Name[:\s]+(?:___|_+)?\s+([A-Za-z][A-Za-z\s\.]+?)(?:\n|Log|Reg|Section|Class|CSE|$)',
            r'Name[:\s]+([A-Za-z][A-Za-z\s\.]+?)(?:\n|Log|Reg|Section|Class|CSE|$)',
            r'Student Name[:\s]+(?:___|_+)?\s+([A-Za-z][A-Za-z\s\.]+?)(?:\n|Log|Reg|Section|Class|CSE|$)',
        ]
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Clean up name (remove extra spaces, underscores, etc.)
                name = re.sub(r'[_\s]+', ' ', name).strip()
                # Remove leading/trailing non-alphabetic characters
                name = re.sub(r'^[^A-Za-z]+|[^A-Za-z]+$', '', name).strip()
                if name and len(name) > 2:  # Valid name should be at least 3 chars
                    details["name"] = name
                    break
        
        # Extract registration number (look for "Log No", "Reg No", "Registration", etc.)
        reg_patterns = [
            r'Log No[\.\s\-:]+(\d+)',
            r'Reg No[\.\s\-:]+(\d+)',
            r'Registration[:\s]+(\d+)',
            r'Roll No[\.\s\-:]+(\d+)',
            r'ID[:\s]+(\d+)',
            r'Reg[:\s]+(\d+)',
        ]
        for pattern in reg_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                reg = match.group(1).strip()
                if reg and len(reg) >= 4:  # Registration numbers are typically 4+ digits
                    details["registration_number"] = reg
                    break
        
        # Extract class/section
        # Handle patterns like "Section C CSE" or "Section C" or "SEC-C"
        class_patterns = [
            r'Section[:\s]+([A-Z])\s+CSE',  # "Section C CSE"
            r'Section[:\s]+([A-Z])(?:\s|$)',  # "Section C"
            r'SEC[-\s]+([A-Z])',  # "SEC-C" or "SEC C"
            r'Class[:\s]+([A-Z])',  # "Class C"
            r'\b([A-Z])\s+CSE\b',  # "C CSE" (standalone)
        ]
        for pattern in class_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                class_letter = match.group(1).upper()
                details["class_section"] = f"SEC-{class_letter}"
                break
        
        # Extract subject (look for subject name, course name, etc.)
        subject_patterns = [
            r'Subject[:\s]+([A-Za-z\s\.]+?)(?:\n|Assignment|Name|$)',
            r'O\.S\.\s+Assignment',
            r'Operating Systems',
            r'Assignment[:\s]+([A-Za-z\s\.]+?)(?:\n|Name|$)',
        ]
        for pattern in subject_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                subject = match.group(1).strip() if match.lastindex else "OPERATING SYSTEMS"
                # Clean up subject
                subject = re.sub(r'[_\s]+', ' ', subject).strip().upper()
                if subject and len(subject) > 2:
                    details["subject"] = subject
                    break
        
        return details
    
    def _parse_response(self, text: str) -> Dict[str, Optional[str]]:
        """Parse Gemini response to extract all student and class details."""
        name = None
        registration = None
        class_section = None
        subject = None
        
        # Extract name
        name_match = re.search(r'Name:\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
        if name_match:
            name_text = name_match.group(1).strip()
            if name_text.lower() not in ['not found', 'none', 'n/a', '']:
                name = name_text
        
        # Extract registration number (look for digits, typically 4+ digits)
        reg_match = re.search(r'Registration:\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
        if reg_match:
            reg_text = reg_match.group(1).strip()
            # Extract only digits from the registration text
            digits = re.findall(r'\d+', reg_text)
            if digits:
                # Take the longest sequence of digits (likely the registration number)
                registration = max(digits, key=len)
        
        # Extract class/section
        class_match = re.search(r'(?:Class|Section):\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
        if class_match:
            class_text = class_match.group(1).strip()
            if class_text.lower() not in ['not found', 'none', 'n/a', '']:
                # Normalize class format (e.g., "A" -> "SEC-A", "Section B" -> "SEC-B")
                class_text = class_text.upper().replace('SECTION', '').replace('SEC', '').strip()
                # Remove any extra characters, keep only letters
                class_letter = re.search(r'[A-Z]', class_text)
                if class_letter:
                    class_section = f"SEC-{class_letter.group()}"
        
        # Extract subject
        subject_match = re.search(r'Subject:\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
        if subject_match:
            subject_text = subject_match.group(1).strip()
            if subject_text.lower() not in ['not found', 'none', 'n/a', '']:
                subject = subject_text
        
        return {
            "name": name,
            "registration_number": registration,
            "class_section": class_section,
            "subject": subject
        }


# Global instance
student_extractor = StudentExtractor()

