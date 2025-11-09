"""Grading engine using GPT-4o and Gemini."""

import json
from typing import Dict, Any, Optional
from openai import OpenAI
import google.generativeai as genai
from loguru import logger

from app.config import settings
from app.utils.prompt_templates import MATH_GRADING_PROMPT, CONCEPTUAL_GRADING_PROMPT
from app.services.ocr_service import ocr_service


class GradingEngine:
    """Grade student work using AI models."""
    
    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.openai_api_key)
        
        # Initialize Gemini only if API key is provided (optional)
        self.gemini_available = False
        if settings.gemini_api_key and settings.gemini_api_key.strip():
            try:
                genai.configure(api_key=settings.gemini_api_key)
                self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
                self.gemini_available = True
                logger.info("Gemini API initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini API: {e}. Will use GPT-4o for all grading.")
                self.gemini_available = False
        else:
            logger.info("Gemini API key not provided. Will use GPT-4o for all grading.")
    
    async def grade_math_question(
        self,
        question_text: str,
        rubric_criteria: Dict[str, Any],
        student_work: str,
        max_points: float,
        student_work_image_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Grade a math question using GPT-4o.
        
        Args:
            question_text: The question text
            rubric_criteria: Grading criteria from rubric
            student_work: Extracted text of student's work
            max_points: Maximum points for this question
            student_work_image_path: Optional path to student work image for vision analysis
        """
        try:
            # Format rubric criteria (this will include grading philosophy and partial credit rules)
            criteria_str = self._format_criteria(rubric_criteria)
            
            # Log formatted criteria for debugging (first 500 chars)
            logger.debug(f"Formatted rubric criteria preview: {criteria_str[:500]}...")
            
            # Build prompt
            prompt = MATH_GRADING_PROMPT.format(
                question_text=question_text,
                rubric_criteria=criteria_str,
                student_work=student_work,
                max_points=max_points
            )
            
            # If we have an image, use vision model
            if student_work_image_path:
                result = await self._grade_with_vision(
                    prompt,
                    student_work_image_path,
                    max_points
                )
            else:
                result = await self._grade_with_text(prompt, max_points)
            
            logger.info(f"Math grading completed: {result['score']}/{max_points}")
            return result
            
        except Exception as e:
            logger.error(f"Math grading failed: {e}")
            raise
    
    async def grade_conceptual_question(
        self,
        question_text: str,
        rubric_criteria: Dict[str, Any],
        student_work: str,
        max_points: float,
        subject: str = "general",
        student_work_image_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Grade a conceptual question using GPT-4o (with vision if image provided).
        Now uses GPT-4o for all grading for better accuracy.
        
        Args:
            question_text: The question text
            rubric_criteria: Grading criteria from rubric
            student_work: Student's written response
            max_points: Maximum points for this question
            subject: Subject area (english, history, science)
            student_work_image_path: Optional path to student work image for vision analysis
        """
        # Format rubric criteria first
        criteria_str = self._format_criteria(rubric_criteria)
        
        # Build prompt
        prompt = CONCEPTUAL_GRADING_PROMPT.format(
            subject=subject,
            question_text=question_text,
            rubric_criteria=criteria_str,
            student_work=student_work,
            max_points=max_points
        )
        
        # Always use GPT-4o for better accuracy
        # If we have an image, use vision model for better understanding
        if student_work_image_path:
            logger.info(f"Using GPT-4o Vision for conceptual grading (question: {question_text})")
            result = await self._grade_with_vision(prompt, student_work_image_path, max_points)
        else:
            logger.info(f"Using GPT-4o for conceptual grading (question: {question_text})")
            result = await self._grade_with_text(prompt, max_points)
        
        logger.info(f"Conceptual grading completed (GPT-4o): {result['score']}/{max_points}")
        return result
    
    async def _grade_with_vision(
        self,
        prompt: str,
        image_path: str,
        max_points: float
    ) -> Dict[str, Any]:
        """Grade using GPT-4 Vision (for handwritten math work)."""
        import base64
        
        # Encode image
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        
        response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=2048
        )
        
        result = json.loads(response.choices[0].message.content)
        self._validate_grading_result(result, max_points)
        return result
    
    async def _grade_with_text(self, prompt: str, max_points: float) -> Dict[str, Any]:
        """Grade using GPT-4o text-only mode."""
        response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=2048
        )
        
        result = json.loads(response.choices[0].message.content)
        self._validate_grading_result(result, max_points)
        return result
    
    # Removed _grade_conceptual_with_gpt4 - now handled directly in grade_conceptual_question
    
    def _format_criteria(self, criteria: Dict[str, Any]) -> str:
        """Format rubric criteria into readable, structured string for GPT."""
        if isinstance(criteria, str):
            return criteria
        
        if isinstance(criteria, dict):
            formatted_parts = []
            
            # Extract question-level information
            question_num = criteria.get("number", "?")
            total_points = criteria.get("total_points", 0)
            
            # Add question header
            formatted_parts.append(f"=== Question {question_num} ({total_points} points total) ===")
            
            # Format parts if they exist (most important for partial credit)
            if "parts" in criteria and isinstance(criteria["parts"], list) and len(criteria["parts"]) > 0:
                formatted_parts.append("\nParts Breakdown:")
                for idx, part in enumerate(criteria["parts"], 1):
                    part_letter = part.get("part", chr(64 + idx))  # A, B, C, etc.
                    part_points = part.get("points", 0)
                    criteria_text = part.get("criteria", "No criteria specified")
                    partial_credit = part.get("partial_credit", "")
                    common_mistakes = part.get("common_mistakes", [])
                    
                    formatted_parts.append(f"\n  Part {part_letter} ({part_points} points):")
                    formatted_parts.append(f"    • Criteria: {criteria_text}")
                    
                    if partial_credit:
                        formatted_parts.append(f"    • Partial Credit Rules: {partial_credit}")
                    
                    if common_mistakes:
                        mistakes_str = ", ".join(common_mistakes) if isinstance(common_mistakes, list) else str(common_mistakes)
                        formatted_parts.append(f"    • Common Mistakes to Watch: {mistakes_str}")
            
            # Format overall criteria if present (catch-all criteria)
            if "criteria" in criteria and criteria["criteria"]:
                formatted_parts.append(f"\nOverall Criteria: {criteria['criteria']}")
            
            # Format grading philosophy if present (question-level)
            if "grading_philosophy" in criteria:
                formatted_parts.append(f"\n[GRADING PHILOSOPHY - Question {question_num}]:")
                philosophy = criteria["grading_philosophy"]
                if isinstance(philosophy, str):
                    # Split by lines or bullets for better formatting
                    for line in philosophy.split('\n'):
                        cleaned = line.strip().lstrip('•').strip()
                        if cleaned:
                            formatted_parts.append(f"  • {cleaned}")
                elif isinstance(philosophy, list):
                    for item in philosophy:
                        formatted_parts.append(f"  • {item}")
                else:
                    formatted_parts.append(f"  • {philosophy}")
            
            # Format minimum marks if specified (CRITICAL for partial credit)
            if "minimum_marks" in criteria:
                min_marks = criteria["minimum_marks"]
                formatted_parts.append(f"\n[MINIMUM MARKS - CRITICAL]: {min_marks}")
                formatted_parts.append(f"  IMPORTANT: Apply this minimum even for basic attempts!")
            
            # Format partial credit rules if present at question level
            if "partial_credit" in criteria:
                formatted_parts.append(f"\n[PARTIAL CREDIT GUIDELINES - Question {question_num}]:")
                formatted_parts.append(f"  {criteria['partial_credit']}")
            
            # Format other important fields
            important_fields = ["note", "instructions", "special_considerations"]
            for field in important_fields:
                if field in criteria and criteria[field]:
                    formatted_parts.append(f"\n{field.replace('_', ' ').title()}: {criteria[field]}")
            
            return "\n".join(formatted_parts)
        
        return str(criteria)
    
    def _validate_grading_result(self, result: Dict[str, Any], max_points: float) -> None:
        """Validate grading result has required fields."""
        required_fields = ["score", "feedback"]
        
        for field in required_fields:
            if field not in result:
                raise ValueError(f"Grading result missing required field: {field}")
        
        # Validate score is within bounds
        score = result["score"]
        if not isinstance(score, (int, float)):
            raise ValueError(f"Score must be a number, got {type(score)}")
        
        if score < 0 or score > max_points:
            logger.warning(f"Score {score} out of bounds [0, {max_points}], clamping")
            result["score"] = max(0, min(score, max_points))
    
    async def grade_question(
        self,
        question_text: str,
        rubric_criteria: Dict[str, Any],
        student_work: str,
        max_points: float,
        subject: str = "general",
        student_work_image_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Grade any question, automatically choosing the best grading method.
        
        Args:
            question_text: The question
            rubric_criteria: Grading criteria
            student_work: Student's answer/work
            max_points: Maximum points
            subject: Subject area
            student_work_image_path: Optional image path
        """
        # Determine grading method based on subject
        math_subjects = ["math", "mathematics", "physics", "chemistry", "calculus", "algebra"]
        
        is_math = any(subj in subject.lower() for subj in math_subjects)
        
        if is_math:
            return await self.grade_math_question(
                question_text,
                rubric_criteria,
                student_work,
                max_points,
                student_work_image_path
            )
        else:
            # Use GPT-4o for conceptual questions (with vision if image provided)
            return await self.grade_conceptual_question(
                question_text,
                rubric_criteria,
                student_work,
                max_points,
                subject,
                student_work_image_path
            )


# Global grading engine instance
grading_engine = GradingEngine()

