"""Multi-question grading service for complete worksheet grading."""

from typing import List, Dict, Any, Optional
from loguru import logger
from pdf2image import convert_from_path
from PIL import Image
import json

from app.services.ocr_service import ocr_service
from app.services.grading_engine import grading_engine
from app.config import settings
from app.utils.text_logger import save_extracted_text_log, format_table_text


class MultiQuestionGrader:
    """Grade all questions in a multi-page worksheet."""
    
    async def extract_and_grade_all_questions(
        self,
        worksheet_path: str,
        rubric_criteria: Dict[str, Any],
        subject: str = "general",
        job_id: Optional[str] = None,
        redis_client = None,
        student_name: Optional[str] = None,
        registration_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract all questions from worksheet and grade each one.
        
        Args:
            worksheet_path: Path to worksheet file (PDF or image)
            rubric_criteria: Full rubric with all questions
            subject: Subject area
            job_id: Optional job ID for progress tracking
            redis_client: Optional Redis client for progress updates
            
        Returns:
            Complete grading results with all questions
        """
        try:
            # Helper function to update progress (preserves existing results like student details)
            async def update_progress(progress: int, message: str):
                if redis_client and job_id:
                    # Get existing status to preserve student details
                    existing_status = await redis_client.get_job_status(job_id) or {}
                    existing_results = existing_status.get("results", {})
                    
                    # Merge new status with existing results
                    await redis_client.set_job_status(job_id, {
                        "status": "processing",
                        "progress": progress,
                        "message": message,
                        "results": existing_results  # Preserve student details from earlier extraction
                    })
            
            # Check if PDF or image
            is_pdf = worksheet_path.lower().endswith('.pdf')
            
            if is_pdf:
                # Extract all pages as images
                await update_progress(5, "Converting PDF to images...")
                logger.info(f"Converting PDF to images: {worksheet_path}")
                images = convert_from_path(worksheet_path, dpi=200)
                logger.info(f"Extracted {len(images)} pages from PDF")
                await update_progress(10, f"Extracted {len(images)} pages from PDF")
            else:
                # Single image
                await update_progress(10, "Loading worksheet image...")
                images = [Image.open(worksheet_path)]
                logger.info(f"Single image worksheet: {worksheet_path}")
            
            # Extract ALL questions from rubric
            rubric_questions = rubric_criteria.get("questions", [])
            total_questions = len(rubric_questions)
            
            # Extract rubric-level grading philosophy (applies to all questions)
            rubric_grading_philosophy = rubric_criteria.get("grading_philosophy", "")
            rubric_minimum_marks = rubric_criteria.get("minimum_marks", "")
            
            if total_questions == 0:
                # Fallback: assume 1 question
                rubric_questions = [{
                    "number": 1,
                    "total_points": 10,
                    "parts": [],
                    "criteria": "General grading criteria"
                }]
                total_questions = 1
            
            logger.info(f"Rubric has {total_questions} questions to grade")
            
            # Merge rubric-level grading philosophy into each question if not already present
            # This ensures all questions benefit from overall grading philosophy
            for question in rubric_questions:
                # Add rubric-level grading philosophy if question doesn't have its own
                if rubric_grading_philosophy and "grading_philosophy" not in question:
                    question["grading_philosophy"] = rubric_grading_philosophy
                # Add rubric-level minimum marks if question doesn't have its own
                if rubric_minimum_marks and "minimum_marks" not in question:
                    question["minimum_marks"] = rubric_minimum_marks
            
            # Extract text from all pages (Progress: 10% -> 50%)
            all_page_texts = []
            ocr_progress_start = 10
            ocr_progress_range = 40  # 10% to 50%
            
            for idx, image in enumerate(images):
                # Calculate OCR progress
                ocr_progress = ocr_progress_start + int((idx / len(images)) * ocr_progress_range)
                await update_progress(ocr_progress, f"Extracting text from page {idx + 1}/{len(images)}...")
                
                # Save image temporarily for OCR
                temp_path = f"/tmp/page_{idx}.jpg"
                image.save(temp_path, 'JPEG')
                
                # Use smart OCR with fallback and stats
                ocr_result = await ocr_service.extract_text_with_smart_fallback(temp_path, subject=subject)
                page_text = ocr_result['text']
                
                # Format table text for better readability
                formatted_text = format_table_text(page_text)
                
                # Log OCR stats
                logger.info(f"📄 Page {idx + 1} OCR: method={ocr_result['method']}, "
                            f"confidence={ocr_result.get('confidence', 0):.2%}, "
                            f"cost=${ocr_result.get('cost', 0):.4f}, "
                            f"lines={ocr_result.get('lines', 0)}")
                
                all_page_texts.append({
                    "page": idx + 1,
                    "text": formatted_text,  # Use formatted text for grading
                    "raw_text": page_text,  # Keep raw text for logging
                    "image_path": temp_path,
                    "ocr_method": ocr_result['method'],
                    "ocr_confidence": ocr_result.get('confidence', 0),
                    "ocr_cost": ocr_result.get('cost', 0),
                    "ocr_lines": ocr_result.get('lines', 0)
                })
                logger.info(f"Extracted text from page {idx + 1}")
            
            await update_progress(50, f"Text extraction complete! Now grading {total_questions} questions...")
            
            # Grade each question (Progress: 50% -> 90%)
            graded_questions = []
            total_score = 0
            total_max_points = 0
            grading_progress_start = 50
            grading_progress_range = 40  # 50% to 90%
            
            for q_idx, rubric_q in enumerate(rubric_questions):
                question_number = rubric_q.get("number", q_idx + 1)
                max_points = rubric_q.get("total_points", 10)
                
                # Calculate grading progress
                grading_progress = grading_progress_start + int((q_idx / total_questions) * grading_progress_range)
                await update_progress(grading_progress, f"Grading Question {question_number}/{total_questions}...")
                
                # Determine which page(s) this question is on
                # Simple heuristic: distribute questions across pages
                page_idx = min(q_idx, len(images) - 1)
                question_text = f"Question {question_number}"
                
                # Get student work for this question (from appropriate page)
                student_work = all_page_texts[page_idx]["text"]
                
                logger.info(f"Grading Question {question_number} (page {page_idx + 1})")
                
                # Grade this question - Always use GPT-4o for better accuracy
                # Use math grading if subject is math, otherwise use conceptual (both now use GPT-4o)
                if subject and subject.lower() in ["math", "mathematics"]:
                    result = await grading_engine.grade_math_question(
                        question_text=question_text,
                        rubric_criteria=rubric_q,
                        student_work=student_work,
                        max_points=max_points,
                        student_work_image_path=all_page_texts[page_idx]["image_path"]
                    )
                else:
                    # Use conceptual grading (now uses GPT-4o instead of Gemini)
                    result = await grading_engine.grade_conceptual_question(
                        question_text=question_text,
                        rubric_criteria=rubric_q,
                        student_work=student_work,
                        max_points=max_points,
                        subject=subject,
                        student_work_image_path=all_page_texts[page_idx]["image_path"]
                    )
                
                # Calculate approximate Y position based on page
                # Each page is ~1100px tall
                base_y_position = page_idx * 1100 + 250  # 250px padding from top of page
                
                graded_questions.append({
                    "question_number": question_number,
                    "page": page_idx + 1,
                    "score": result["score"],
                    "max_points": max_points,
                    "feedback": result["feedback"],
                    "strengths": result.get("strengths", []),
                    "weaknesses": result.get("weaknesses", []),
                    "step_analysis": result.get("step_analysis", ""),
                    "position": {
                        "x": 150,
                        "y": base_y_position
                    }
                })
                
                total_score += result["score"]
                total_max_points += max_points
                
                logger.info(f"Question {question_number}: {result['score']}/{max_points}")
            
            # Compile overall results (Progress: 90% -> 95%)
            await update_progress(90, "All questions graded! Compiling results...")
            
            percentage = round((total_score / total_max_points) * 100) if total_max_points > 0 else 0
            
            await update_progress(95, f"Grading complete! Score: {total_score}/{total_max_points} ({percentage}%)")
            
            # Calculate total OCR cost and average confidence
            total_ocr_cost = sum(page.get('ocr_cost', 0) for page in all_page_texts)
            avg_ocr_confidence = sum(page.get('ocr_confidence', 0) for page in all_page_texts) / len(all_page_texts) if all_page_texts else 0
            
            # Combine all page texts for logging (use raw OCR text to match terminal output)
            full_extracted_text = "\n\n".join([
                f"{'='*80}\nPage {page['page']}\n{'='*80}\n{page.get('raw_text', page['text'])}"
                for page in all_page_texts
            ])
            
            # Save extracted text to log file
            log_file_path = save_extracted_text_log(
                text=full_extracted_text,
                student_name=student_name,
                registration_number=registration_number,
                job_id=job_id
            )
            
            # Add OCR stats to results
            results = {
                "total_score": total_score,
                "total_max_points": total_max_points,
                "percentage": percentage,
                "questions": graded_questions,
                "total_pages": len(images),
                "subject": subject,
                "extracted_text_log": log_file_path,  # Include log file path
                "ocr_stats": {
                    "total_cost": round(total_ocr_cost, 4),
                    "average_confidence": round(avg_ocr_confidence, 4),
                    "pages_processed": len(all_page_texts),
                    "methods_used": list(set(page.get('ocr_method', 'unknown') for page in all_page_texts))
                }
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Multi-question grading failed: {e}")
            raise


# Global instance
multi_question_grader = MultiQuestionGrader()

