"""Prompt templates for AI grading."""


RUBRIC_PARSER_PROMPT = """You are an expert at parsing grading rubrics. 

Analyze the provided rubric document and extract the grading criteria in a structured JSON format.

Extract the following information:
1. Question numbers and parts (A, B, C, D, etc.)
2. Point allocation for each part
3. Scoring criteria and requirements
4. Partial credit rules (if mentioned) - CRITICAL: Extract exact ranges and minimum marks
5. Common mistakes to look for (if mentioned)
6. Grading philosophy (if mentioned) - Look for phrases like:
   - "Minimum marks for any answered question"
   - "Completely blank/no attempt"
   - "Partial answer with effort"
   - "Good answer with minor errors"
   - "Complete correct answer"
   - "Benefit of doubt"
   - Any scoring ranges (e.g., "1.25-1.5 marks")

Return ONLY valid JSON in this exact format:
{
  "subject": "math" or "english" or "science" or "history",
  "total_points": <number>,
  "grading_philosophy": "Optional: Overall grading philosophy including minimum marks, partial credit ranges, benefit of doubt rules, etc.",
  "questions": [
    {
      "number": 1,
      "total_points": <number>,
      "minimum_marks": <optional: minimum marks for any attempt, e.g., "1.25/2">,
      "parts": [
        {
          "part": "A",
          "points": <number>,
          "criteria": "Detailed description of what earns full points",
          "partial_credit": "Detailed description of partial credit rules including specific ranges (e.g., '1.25-1.5 for effort, 1.5-1.75 for good with minor errors')",
          "common_mistakes": ["mistake 1", "mistake 2"]
        }
      ],
      "partial_credit": "Optional: Question-level partial credit guidelines"
    }
  ]
}

CRITICAL EXTRACTION RULES:
- If you see grading philosophy text (e.g., "Minimum marks for any answered question: 1.25/2"), extract it
- If you see partial credit ranges (e.g., "1.25-1.5 marks"), extract them exactly
- If you see "benefit of doubt" rules (e.g., "0.5 marks for blank"), extract them
- Include all partial credit information at both question and part levels
- Be thorough and precise - partial credit rules are essential for accurate grading

Be thorough and precise in extracting all scoring criteria, especially partial credit rules and grading philosophy.
"""


MATH_GRADING_PROMPT = """You are an expert mathematics teacher grading student work.

Question:
{question_text}

Rubric (READ CAREFULLY - Follow partial credit rules exactly):
{rubric_criteria}

Student Work:
{student_work}

IMPORTANT GRADING GUIDELINES:
1. Read the rubric carefully, especially partial credit rules and grading philosophy
2. Award partial credit generously when the student shows effort and understanding
3. Minimum marks: If a grading philosophy specifies minimum marks (e.g., 1.25/2 for any attempt), apply it
4. Blank answers: Check if there's a "benefit of doubt" rule for blank answers (e.g., 0.5 marks)
5. Partial answers: Award marks in the specified range (e.g., 1.25-1.5 for effort, 1.5-1.75 for good with minor errors)
6. Complete answers: Full marks only if fully correct per rubric criteria

Analyze the student's work and provide:
1. A score out of {max_points} points (following rubric partial credit rules exactly)
2. Detailed feedback explaining the grade
3. Step-by-step analysis of the student's approach
4. Specific errors or correct steps
5. Justification for partial credit awarded (if applicable)

Consider:
- Mathematical correctness
- Show of work and reasoning
- Proper notation and units
- Arithmetic accuracy
- Completeness of the solution
- Effort shown (even if incorrect)
- Partial understanding demonstrated

Return ONLY valid JSON in this format:
{{
  "score": <number between 0 and {max_points}, following rubric partial credit rules>,
  "max_points": {max_points},
  "feedback": "Detailed explanation of the grade, including why partial credit was/wasn't awarded",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "step_analysis": "Step-by-step breakdown of student's work with specific point allocations"
}}

CRITICAL: Apply the rubric's partial credit philosophy precisely. If the rubric specifies minimum marks for attempts, award them. If it specifies ranges for partial credit, use those ranges.
"""


CONCEPTUAL_GRADING_PROMPT = """You are an expert teacher grading a student's written response.

Subject: {subject}

Question:
{question_text}

Rubric (READ CAREFULLY - Follow partial credit rules exactly):
{rubric_criteria}

Student Response:
{student_work}

IMPORTANT GRADING GUIDELINES:
1. Read the rubric carefully, especially partial credit rules and grading philosophy
2. Award partial credit generously when the student shows effort and understanding
3. Minimum marks: If a grading philosophy specifies minimum marks (e.g., 1.25/2 for any attempt), apply it
4. Blank answers: Check if there's a "benefit of doubt" rule for blank answers (e.g., 0.5 marks)
5. Partial answers: Award marks in the specified range (e.g., 1.25-1.5 for effort, 1.5-1.75 for good with minor errors)
6. Complete answers: Full marks only if fully correct per rubric criteria

Evaluate the response based on:
1. Understanding of key concepts
2. Accuracy of information
3. Depth of analysis
4. Clarity of expression
5. Use of evidence/examples
6. Organization and structure
7. Effort shown (even if incomplete)

Return ONLY valid JSON in this format:
{{
  "score": <number between 0 and {max_points}, following rubric partial credit rules>,
  "max_points": {max_points},
  "feedback": "Constructive feedback explaining the grade and partial credit decisions",
  "strengths": ["strength 1", "strength 2"],
  "areas_for_improvement": ["area 1", "area 2"],
  "suggestions": "Specific suggestions for improvement"
}}

CRITICAL: Apply the rubric's partial credit philosophy precisely. If the rubric specifies minimum marks for attempts, award them. If it specifies ranges for partial credit, use those ranges. Provide encouraging, constructive feedback that helps the student learn.
"""


OCR_EXTRACTION_PROMPT = """Extract all text from this image, paying special attention to:

1. Mathematical notation and equations (convert to LaTeX where appropriate)
2. Handwritten text (transcribe clearly)
3. Diagrams or graphs (describe them)
4. Any work shown or calculations

Preserve the structure and formatting as much as possible.
For mathematical expressions, use LaTeX notation in the format: $expression$

Return the extracted text maintaining the original layout.
"""

