"""Rubric parsing service using GPT-4o."""

import json
from typing import Dict, Any
from openai import OpenAI
from loguru import logger

from app.config import settings
from app.utils.prompt_templates import RUBRIC_PARSER_PROMPT
from app.services.ocr_service import ocr_service


class RubricParser:
    """Parse rubric documents into structured JSON format."""
    
    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.openai_api_key)
    
    async def parse_rubric(self, file_path: str) -> Dict[str, Any]:
        """
        Parse a rubric file (PDF or image) into structured JSON.
        
        Args:
            file_path: Path to rubric file
            
        Returns:
            Structured rubric data as dictionary
        """
        try:
            # First, extract text from the rubric using OCR
            logger.info(f"Extracting text from rubric: {file_path}")
            rubric_text = await ocr_service.extract_text(file_path)
            
            if not rubric_text.strip():
                raise ValueError("No text extracted from rubric")
            
            # Use GPT-4o to parse the rubric into structured format
            logger.info("Parsing rubric with GPT-4o")
            parsed_rubric = await self._parse_with_gpt4(rubric_text)
            
            # Validate the parsed rubric
            self._validate_rubric(parsed_rubric)
            
            logger.info(f"Successfully parsed rubric with {len(parsed_rubric.get('questions', []))} questions")
            return parsed_rubric
            
        except Exception as e:
            logger.error(f"Rubric parsing failed: {e}")
            raise
    
    async def _parse_with_gpt4(self, rubric_text: str) -> Dict[str, Any]:
        """Use GPT-4o with JSON mode to parse rubric text."""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": RUBRIC_PARSER_PROMPT
                    },
                    {
                        "role": "user",
                        "content": f"Parse this rubric:\n\n{rubric_text}"
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=4096
            )
            
            parsed_json = json.loads(response.choices[0].message.content)
            return parsed_json
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse GPT-4 response as JSON: {e}")
            raise ValueError("GPT-4 did not return valid JSON")
        except Exception as e:
            logger.error(f"GPT-4 parsing error: {e}")
            raise
    
    def _validate_rubric(self, rubric: Dict[str, Any]) -> None:
        """Validate that rubric has required structure."""
        required_fields = ["questions"]
        
        for field in required_fields:
            if field not in rubric:
                raise ValueError(f"Rubric missing required field: {field}")
        
        if not isinstance(rubric["questions"], list):
            raise ValueError("Rubric 'questions' must be a list")
        
        if not rubric["questions"]:
            raise ValueError("Rubric must contain at least one question")
        
        # Log if grading philosophy is present (good sign!)
        if "grading_philosophy" in rubric:
            logger.info("Rubric contains grading philosophy - this will improve partial credit accuracy")
        
        # Validate each question
        for i, question in enumerate(rubric["questions"]):
            if "number" not in question:
                raise ValueError(f"Question {i} missing 'number' field")
            
            if "parts" not in question or not isinstance(question["parts"], list):
                raise ValueError(f"Question {i} missing or invalid 'parts' field")
            
            # Log if question has grading philosophy or minimum marks
            if "grading_philosophy" in question:
                logger.debug(f"Question {question.get('number', i+1)} has its own grading philosophy")
            if "minimum_marks" in question:
                logger.debug(f"Question {question.get('number', i+1)} has minimum marks: {question['minimum_marks']}")
            
            # Validate each part
            for j, part in enumerate(question["parts"]):
                if "points" not in part:
                    raise ValueError(f"Question {i}, part {j} missing 'points' field")
                if "criteria" not in part:
                    raise ValueError(f"Question {i}, part {j} missing 'criteria' field")
    
    async def parse_rubric_from_text(self, rubric_text: str) -> Dict[str, Any]:
        """
        Parse rubric from already-extracted text.
        Useful if you already have the text and don't need OCR.
        """
        try:
            parsed_rubric = await self._parse_with_gpt4(rubric_text)
            self._validate_rubric(parsed_rubric)
            return parsed_rubric
        except Exception as e:
            logger.error(f"Rubric text parsing failed: {e}")
            raise


# Global rubric parser instance
rubric_parser = RubricParser()

