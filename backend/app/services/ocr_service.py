"""OCR service for extracting text from images and PDFs."""

import base64
from pathlib import Path
from typing import Optional
from openai import OpenAI
from google.cloud import vision
from loguru import logger
import PyPDF2
from pdf2image import convert_from_path
from PIL import Image
import io

from app.config import settings
from app.utils.prompt_templates import OCR_EXTRACTION_PROMPT
from typing import Dict, Any


class OCRService:
    """Handle OCR operations using Novita PaddleOCR-VL, GPT-4 Vision, and Google Cloud Vision."""
    
    def __init__(self):
        # Initialize AI Client (OpenRouter or Direct)
        if settings.openrouter_api_key:
            self.openai_client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=settings.openrouter_api_key,
                default_headers={
                    "HTTP-Referer": settings.site_url,
                    "X-Title": settings.site_name,
                }
            )
            self.using_openrouter = True
        else:
            self.openai_client = OpenAI(api_key=settings.openai_api_key)
            self.using_openrouter = False
            
        # Initialize Novita API client for PaddleOCR-VL
        self.novita_client = OpenAI(
            api_key=settings.novita_api_key,
            base_url=settings.novita_base_url
        )
        
        # Initialize Google Cloud Vision only if credentials are provided
        self.vision_client = None
        if settings.google_application_credentials:
            self.vision_client = vision.ImageAnnotatorClient()
    
    def _estimate_tokens(self, image_path: str, prompt: str, response_text: str = "") -> dict:
        """
        Estimate tokens for cost calculation.
        - Image tokens: ~85 tokens per 512x512 tile
        - Prompt tokens: ~4 characters per token
        - Response tokens: ~4 characters per token
        """
        try:
            # Get image dimensions
            img = Image.open(image_path)
            width, height = img.size
            
            # Estimate image tiles (512x512)
            tiles = ((width + 511) // 512) * ((height + 511) // 512)
            image_tokens = tiles * 85
            
            # Estimate text tokens (rough: 4 chars per token)
            prompt_tokens = len(prompt) // 4
            response_tokens = len(response_text) // 4 if response_text else 0
            
            total_tokens = image_tokens + prompt_tokens + response_tokens
            
            return {
                'image_tokens': image_tokens,
                'prompt_tokens': prompt_tokens,
                'response_tokens': response_tokens,
                'total_tokens': total_tokens,
                'cost': (total_tokens / 1_000_000) * 0.02  # $0.02 per 1M tokens
            }
        except Exception as e:
            logger.warning(f"Token estimation failed: {e}, using defaults")
            # Default estimation: assume 1000 tokens
            return {
                'image_tokens': 500,
                'prompt_tokens': 50,
                'response_tokens': 450,
                'total_tokens': 1000,
                'cost': 0.00002
            }
    
    def encode_image(self, image_path: str) -> str:
        """Encode image to base64 string."""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    
    async def extract_text_gpt4_vision(self, image_path: str) -> str:
        """
        Extract text from image using GPT-4 Vision.
        Best for math worksheets with equations and handwriting.
        """
        try:
            base64_image = self.encode_image(image_path)
            model = "openai/gpt-4o" if self.using_openrouter else "gpt-4o"
            
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": OCR_EXTRACTION_PROMPT
                            },
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
                max_tokens=4096,
                temperature=0.2
            )
            
            extracted_text = response.choices[0].message.content
            logger.info(f"GPT-4 Vision OCR completed for {image_path}")
            return extracted_text
            
        except Exception as e:
            logger.error(f"GPT-4 Vision OCR failed: {e}")
            raise
    
    async def extract_text_google_vision(self, image_path: str) -> str:
        """
        Extract text from image using Google Cloud Vision.
        More cost-effective for text-based subjects.
        """
        if not self.vision_client:
            logger.warning("Google Cloud Vision not configured, falling back to GPT-4 Vision")
            return await self.extract_text_gpt4_vision(image_path)
        
        try:
            with open(image_path, 'rb') as image_file:
                content = image_file.read()
            
            image = vision.Image(content=content)
            response = self.vision_client.document_text_detection(image=image)
            
            if response.error.message:
                raise Exception(f"Google Vision API error: {response.error.message}")
            
            text = response.full_text_annotation.text
            logger.info(f"Google Vision OCR completed for {image_path}")
            return text
            
        except Exception as e:
            logger.error(f"Google Vision OCR failed: {e}")
            # Fallback to GPT-4 Vision
            logger.info("Falling back to GPT-4 Vision")
            return await self.extract_text_gpt4_vision(image_path)
    
    async def extract_text_novita_paddleocr(self, image_path: str) -> Dict[str, Any]:
        """
        Extract text from image using Novita PaddleOCR-VL API.
        Supports tables, formulas, charts, and handwritten text.
        
        Returns:
            Dict with 'text', 'confidence', 'cost', 'method', 'lines'
        """
        try:
            logger.info(f"Novita PaddleOCR-VL extracting from: {image_path}")
            
            # Encode image to base64
            base64_image = self.encode_image(image_path)
            
            # Prepare prompt
            prompt = OCR_EXTRACTION_PROMPT
            
            # Make API call
            response = self.novita_client.chat.completions.create(
                model="paddlepaddle/paddleocr-vl",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
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
                max_tokens=4096,  # Reduced to leave room for input tokens (model context: 16384)
                temperature=0.2
            )
            
            extracted_text = response.choices[0].message.content
            
            # Estimate tokens and cost
            token_info = self._estimate_tokens(image_path, prompt, extracted_text)
            
            # Calculate lines
            line_count = len(extracted_text.split('\n')) if extracted_text else 0
            
            logger.info(f"Novita PaddleOCR-VL: extracted {line_count} lines, "
                       f"tokens={token_info['total_tokens']:,}, cost=${token_info['cost']:.6f}")
            
            # Log sample output for debugging
            if extracted_text:
                text_preview = extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text
                logger.debug(f"📝 Extracted text preview ({len(extracted_text)} chars):\n{text_preview}")
            
            return {
                'text': extracted_text or '',
                'confidence': 0.90,  # Novita PaddleOCR-VL is highly accurate
                'cost': token_info['cost'],
                'method': 'novita_paddleocr',
                'lines': line_count,
                'tokens': token_info['total_tokens'],
                'token_breakdown': {
                    'image': token_info['image_tokens'],
                    'prompt': token_info['prompt_tokens'],
                    'response': token_info['response_tokens']
                }
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Novita PaddleOCR-VL failed: {error_msg}")
            
            # Handle specific error types
            if "401" in error_msg or "Unauthorized" in error_msg:
                logger.error("Authentication failed: Check NOVITA_API_KEY in .env file")
            elif "429" in error_msg or "rate limit" in error_msg.lower():
                logger.error("Rate limit exceeded: Wait and retry")
            elif "404" in error_msg or "not found" in error_msg.lower():
                logger.error("Model or endpoint not found: Check base URL and model name")
            
            return {
                'text': '',
                'confidence': 0.0,
                'cost': 0.0,
                'method': 'novita_paddleocr',
                'error': error_msg,
                'lines': 0
            }
    
    async def extract_text_gemini_vision_with_stats(self, image_path: str) -> Dict[str, Any]:
        """Gemini Vision with consistent return format."""
        try:
            # Note: Current code doesn't have Gemini Vision, so we estimate
            # You may need to implement this or use Google Vision as fallback
            text = await self.extract_text_google_vision(image_path)
            
            return {
                'text': text,
                'confidence': 0.85,  # Estimated for Google Vision
                'cost': 0.002,  # Approximate cost per image
                'method': 'google_vision',
                'lines': len(text.split('\n'))
            }
        except Exception as e:
            logger.error(f"Gemini/Google Vision failed: {str(e)}")
            return {
                'text': '',
                'confidence': 0.0,
                'cost': 0.002,
                'method': 'google_vision',
                'error': str(e),
                'lines': 0
            }
    
    async def extract_text_gpt4_vision_with_stats(self, image_path: str) -> Dict[str, Any]:
        """GPT-4 Vision with consistent return format."""
        try:
            text = await self.extract_text_gpt4_vision(image_path)
            
            return {
                'text': text,
                'confidence': 0.95,  # GPT-4 is highly accurate
                'cost': 0.01,  # Approximate cost per image
                'method': 'gpt4_vision',
                'lines': len(text.split('\n'))
            }
        except Exception as e:
            logger.error(f"GPT-4 Vision failed: {str(e)}")
            raise
    
    async def extract_text_with_smart_fallback(
        self,
        image_path: str,
        subject: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Smart OCR with simplified fallback chain:
        1. Novita PaddleOCR-VL (cost-effective, highly accurate, supports tables/formulas/charts) - try first
        2. GPT-4 Vision (expensive but reliable) - fallback if Novita fails
        
        Returns:
            Dict with 'text', 'confidence', 'cost', 'method', 'lines', and optional 'fallback_reason'
        """
        
        # Stage 1: Try Novita PaddleOCR-VL first (primary method)
        logger.info("📊 OCR Stage 1: Trying Novita PaddleOCR-VL...")
        novita_result = await self.extract_text_novita_paddleocr(image_path)
        
        # Check if Novita succeeded (has text and no error)
        if novita_result.get('text') and novita_result.get('text').strip() and not novita_result.get('error'):
            logger.info(f"✅ Novita PaddleOCR-VL succeeded: {novita_result.get('lines', 0)} lines, "
                       f"cost=${novita_result.get('cost', 0):.6f}")
            return novita_result
        
        # Stage 2: Fallback to GPT-4 Vision if Novita failed or returned empty
        logger.info(f"⚠️ Novita PaddleOCR-VL failed or returned empty, falling back to GPT-4 Vision...")
        if novita_result.get('error'):
            logger.info(f"   Reason: {novita_result.get('error')}")
        
        gpt_result = await self.extract_text_gpt4_vision_with_stats(image_path)
        gpt_result['fallback_reason'] = f"Novita PaddleOCR-VL failed: {novita_result.get('error', 'empty result')}"
        
        logger.info(f"✅ GPT-4 Vision completed: {gpt_result.get('lines', 0)} lines, "
                   f"cost=${gpt_result.get('cost', 0):.4f}")
        
        return gpt_result
    
    async def extract_from_pdf(self, pdf_path: str, use_gpt4: bool = False, subject: Optional[str] = None) -> str:
        """
        Extract text from PDF. Convert to images first for better OCR.
        
        Args:
            pdf_path: Path to PDF file
            use_gpt4: If True, prefer GPT-4 Vision for math subjects (deprecated, use subject instead)
            subject: Subject area (math, english, etc.) - helps determine OCR preferences
        """
        try:
            # Try to extract text directly from PDF first
            pdf_text = self._extract_pdf_text_direct(pdf_path)
            
            if pdf_text.strip() and len(pdf_text) > 50:
                logger.info(f"Extracted text directly from PDF: {pdf_path}")
                return pdf_text
            
            # If direct extraction fails or yields little text, convert to images
            logger.info(f"Converting PDF to images for OCR: {pdf_path}")
            images = convert_from_path(pdf_path, dpi=300)
            
            extracted_pages = []
            for i, image in enumerate(images):
                # Save temporary image as JPG for OCR
                temp_image_path = f"/tmp/page_{i}.jpg"
                image.save(temp_image_path, 'JPEG')
                
                # Use smart fallback: Novita PaddleOCR-VL -> GPT-4 Vision
                # Pass subject if provided, or infer from use_gpt4 (for backward compatibility)
                ocr_subject = subject
                if not ocr_subject and use_gpt4:
                    ocr_subject = "math"  # Backward compatibility
                
                ocr_result = await self.extract_text_with_smart_fallback(
                    temp_image_path,
                    subject=ocr_subject
                )
                page_text = ocr_result['text']
                
                logger.info(f"📄 Page {i + 1} OCR: method={ocr_result['method']}, "
                           f"confidence={ocr_result.get('confidence', 0):.2%}, "
                           f"cost=${ocr_result.get('cost', 0):.4f}")
                
                extracted_pages.append(f"--- Page {i + 1} ---\n{page_text}")
            
            full_text = "\n\n".join(extracted_pages)
            logger.info(f"PDF OCR completed: {pdf_path} ({len(images)} pages)")
            return full_text
            
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise
    
    def _extract_pdf_text_direct(self, pdf_path: str) -> str:
        """Try to extract text directly from PDF without OCR."""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_parts = []
                
                for page in pdf_reader.pages:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)
                
                return "\n\n".join(text_parts)
        except Exception as e:
            logger.warning(f"Direct PDF text extraction failed: {e}")
            return ""
    
    async def extract_text(
        self,
        file_path: str,
        subject: Optional[str] = None
    ) -> str:
        """
        Extract text from file (PDF or image).
        Automatically chooses the best OCR method based on file type and subject.
        
        Args:
            file_path: Path to file
            subject: Subject area (math, english, etc.) - affects OCR choice
        """
        path = Path(file_path)
        file_extension = path.suffix.lower()
        
        # Determine if we should use GPT-4 Vision (better for math)
        use_gpt4 = subject and subject.lower() in ["math", "mathematics", "physics", "chemistry"]
        
        if file_extension == '.pdf':
            return await self.extract_from_pdf(file_path, use_gpt4=use_gpt4, subject=subject)
        elif file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
            # Use smart fallback for images: Novita PaddleOCR-VL -> GPT-4 Vision
            ocr_result = await self.extract_text_with_smart_fallback(file_path, subject=subject)
            return ocr_result['text']
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")


# Global OCR service instance
ocr_service = OCRService()

