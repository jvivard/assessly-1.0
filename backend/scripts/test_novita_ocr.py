"""Test script for Novita PaddleOCR-VL API endpoint."""

import os
import sys
import base64
import time
from pathlib import Path

# Try to import OpenAI, install if not available
try:
    from openai import OpenAI
except ImportError:
    print("❌ Error: openai package not found")
    print("   Install it with: pip install openai")
    sys.exit(1)

# Try to import dotenv, install if not available
try:
    from dotenv import load_dotenv
    # Try to load .env from backend directory
    backend_dir = Path(__file__).parent.parent
    env_file = backend_dir / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        print(f"✅ Loaded .env file from: {env_file}")
    else:
        load_dotenv()  # Try current directory
except ImportError:
    print("⚠️  Warning: python-dotenv not found, using environment variables directly")
    print("   Install it with: pip install python-dotenv")

# OCR prompt (same as in app/utils/prompt_templates.py)
OCR_EXTRACTION_PROMPT = """Extract all text from this image, paying special attention to:

1. Mathematical notation and equations (convert to LaTeX where appropriate)
2. Handwritten text (transcribe clearly)
3. Diagrams or graphs (describe them)
4. Any work shown or calculations

Preserve the structure and formatting as much as possible.
For mathematical expressions, use LaTeX notation in the format: $expression$

Return the extracted text maintaining the original layout.
"""

# Get API key from environment
NOVITA_API_KEY = os.getenv("NOVITA_API_KEY")
NOVITA_BASE_URL = os.getenv("NOVITA_BASE_URL", "https://api.novita.ai/openai")


def encode_image(image_path: str) -> str:
    """Encode image to base64 string."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')


def estimate_tokens(image_path: str, prompt: str, response_text: str = "") -> dict:
    """
    Estimate tokens for cost calculation.
    - Image tokens: ~85 tokens per 512x512 tile
    - Prompt tokens: ~4 characters per token
    - Response tokens: ~4 characters per token
    """
    try:
        from PIL import Image
        
        # Get image dimensions
        img = Image.open(image_path)
        width, height = img.size
        
        # Estimate image tiles (512x512)
        tiles = ((width + 511) // 512) * ((height + 511) // 512)
        image_tokens = tiles * 85
    except ImportError:
        # PIL not available, use default estimation
        print("⚠️  Warning: Pillow not available, using default token estimation")
        image_tokens = 500  # Default estimate
    except Exception as e:
        print(f"⚠️  Warning: Could not read image dimensions: {e}, using default")
        image_tokens = 500  # Default estimate
    
    # Estimate text tokens (rough: 4 chars per token)
    prompt_tokens = len(prompt) // 4
    response_tokens = len(response_text) // 4 if response_text else 0
    
    total_tokens = image_tokens + prompt_tokens + response_tokens
    
    return {
        'image_tokens': image_tokens,
        'prompt_tokens': prompt_tokens,
        'response_tokens': response_tokens,
        'total_tokens': total_tokens,
        'cost': (total_tokens / 1_000_000) * 0.02
    }


def test_novita_ocr(image_path: str):
    """Test Novita PaddleOCR-VL API with an image."""
    
    if not os.path.exists(image_path):
        print(f"❌ Error: Image file not found: {image_path}")
        return
    
    # Check if API key is set
    if not NOVITA_API_KEY:
        print("❌ Error: NOVITA_API_KEY not found in environment variables")
        print("   Set it in your .env file or export it:")
        print("   export NOVITA_API_KEY=your_api_key_here")
        print("\n   Or create a .env file in the backend directory with:")
        print("   NOVITA_API_KEY=your_api_key_here")
        return
    
    print(f"📸 Testing Novita OCR with image: {image_path}")
    print(f"🔑 API Key: {NOVITA_API_KEY[:10]}...")
    print(f"🌐 Base URL: {NOVITA_BASE_URL}")
    print("-" * 80)
    
    # Create OpenAI client for Novita API
    client = OpenAI(
        api_key=NOVITA_API_KEY,
        base_url=NOVITA_BASE_URL
    )
    
    # Encode image
    print("📤 Encoding image to base64...")
    base64_image = encode_image(image_path)
    
    # Prepare prompt
    prompt = OCR_EXTRACTION_PROMPT
    
    # Make API call
    print("🚀 Calling Novita PaddleOCR-VL API...")
    start_time = time.time()
    
    try:
        response = client.chat.completions.create(
            model="paddlepaddle/paddleocr-vl",
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
            max_tokens=4096,  # Reduced from 16384 to leave room for input tokens
            temperature=0.2
        )
        
        elapsed_time = time.time() - start_time
        extracted_text = response.choices[0].message.content
        
        # Estimate tokens and cost
        token_info = estimate_tokens(image_path, OCR_EXTRACTION_PROMPT, extracted_text)
        
        # Print results
        print("✅ API Call Successful!")
        print("-" * 80)
        print(f"⏱️  Response Time: {elapsed_time:.2f} seconds")
        print(f"📊 Tokens:")
        print(f"   - Image: {token_info['image_tokens']:,}")
        print(f"   - Prompt: {token_info['prompt_tokens']:,}")
        print(f"   - Response: {token_info['response_tokens']:,}")
        print(f"   - Total: {token_info['total_tokens']:,}")
        print(f"💰 Estimated Cost: ${token_info['cost']:.6f}")
        print("-" * 80)
        print(f"📝 Extracted Text ({len(extracted_text)} characters):")
        print("-" * 80)
        print(extracted_text[:1000])  # First 1000 chars
        if len(extracted_text) > 1000:
            print(f"\n... ({len(extracted_text) - 1000} more characters)")
        print("-" * 80)
        
        # Save full output to file
        output_file = image_path.replace('.jpg', '_ocr_output.txt').replace('.png', '_ocr_output.txt')
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"Novita OCR Output\n")
            f.write(f"Image: {image_path}\n")
            f.write(f"Response Time: {elapsed_time:.2f} seconds\n")
            f.write(f"Tokens: {token_info['total_tokens']:,}\n")
            f.write(f"Cost: ${token_info['cost']:.6f}\n")
            f.write("-" * 80 + "\n\n")
            f.write(extracted_text)
        
        print(f"💾 Full output saved to: {output_file}")
        
    except Exception as e:
        elapsed_time = time.time() - start_time
        print(f"❌ API Call Failed after {elapsed_time:.2f} seconds")
        print(f"Error: {str(e)}")
        print(f"Error Type: {type(e).__name__}")
        
        # Check for specific error types
        if "401" in str(e) or "Unauthorized" in str(e):
            print("\n💡 Hint: Check your NOVITA_API_KEY in .env file")
        elif "429" in str(e) or "rate limit" in str(e).lower():
            print("\n💡 Hint: Rate limit exceeded, wait a moment and try again")
        elif "404" in str(e) or "not found" in str(e).lower():
            print("\n💡 Hint: Check the model name or base URL")
        
        raise


if __name__ == "__main__":
    # Check if image path provided
    if len(sys.argv) < 2:
        print("Usage: python test_novita_ocr.py <image_path>")
        print("\nExample:")
        print("  python test_novita_ocr.py /path/to/worksheet.jpg")
        print("  python test_novita_ocr.py ../uploads/worksheets/test.png")
        sys.exit(1)
    
    image_path = sys.argv[1]
    test_novita_ocr(image_path)

