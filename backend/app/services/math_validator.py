"""Mathematical validation using SymPy."""

from typing import Optional, Tuple
import sympy as sp
from sympy.parsing.latex import parse_latex
from sympy.parsing.sympy_parser import parse_expr
from loguru import logger


class MathValidator:
    """Validate mathematical answers using symbolic computation."""
    
    @staticmethod
    def parse_expression(expr_str: str, is_latex: bool = False) -> Optional[sp.Expr]:
        """
        Parse mathematical expression from string or LaTeX.
        
        Args:
            expr_str: Expression string
            is_latex: Whether the expression is in LaTeX format
            
        Returns:
            SymPy expression or None if parsing fails
        """
        try:
            if is_latex:
                # Parse LaTeX
                return parse_latex(expr_str)
            else:
                # Parse regular expression
                return parse_expr(expr_str, evaluate=False)
        except Exception as e:
            logger.warning(f"Failed to parse expression '{expr_str}': {e}")
            return None
    
    @staticmethod
    def are_equivalent(
        expr1_str: str,
        expr2_str: str,
        is_latex1: bool = False,
        is_latex2: bool = False
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if two mathematical expressions are equivalent.
        
        Args:
            expr1_str: First expression
            expr2_str: Second expression
            is_latex1: Whether first expression is LaTeX
            is_latex2: Whether second expression is LaTeX
            
        Returns:
            Tuple of (are_equivalent: bool, message: Optional[str])
        """
        try:
            expr1 = MathValidator.parse_expression(expr1_str, is_latex1)
            expr2 = MathValidator.parse_expression(expr2_str, is_latex2)
            
            if expr1 is None or expr2 is None:
                return False, "Could not parse one or both expressions"
            
            # Simplify both expressions
            simplified1 = sp.simplify(expr1)
            simplified2 = sp.simplify(expr2)
            
            # Check equivalence
            difference = sp.simplify(simplified1 - simplified2)
            
            if difference == 0:
                return True, "Expressions are mathematically equivalent"
            else:
                return False, f"Expressions differ by: {difference}"
                
        except Exception as e:
            logger.error(f"Error comparing expressions: {e}")
            return False, f"Error during comparison: {str(e)}"
    
    @staticmethod
    def solve_equation(equation_str: str, variable: str = 'x') -> Optional[list]:
        """
        Solve an equation for a given variable.
        
        Args:
            equation_str: Equation string (e.g., "x^2 + 2*x - 3 = 0")
            variable: Variable to solve for
            
        Returns:
            List of solutions or None if solving fails
        """
        try:
            # Parse equation (split on '=')
            if '=' in equation_str:
                left, right = equation_str.split('=')
                left_expr = parse_expr(left.strip())
                right_expr = parse_expr(right.strip())
                equation = sp.Eq(left_expr, right_expr)
            else:
                # Assume equation equals 0
                equation = parse_expr(equation_str)
            
            # Solve
            var = sp.Symbol(variable)
            solutions = sp.solve(equation, var)
            
            return solutions
            
        except Exception as e:
            logger.error(f"Error solving equation '{equation_str}': {e}")
            return None
    
    @staticmethod
    def validate_answer(
        student_answer: str,
        correct_answer: str,
        tolerance: float = 1e-6
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate student's mathematical answer against correct answer.
        
        Args:
            student_answer: Student's answer
            correct_answer: Correct answer
            tolerance: Numerical tolerance for floating point comparison
            
        Returns:
            Tuple of (is_correct: bool, message: Optional[str])
        """
        try:
            # Try symbolic comparison first
            is_equiv, msg = MathValidator.are_equivalent(student_answer, correct_answer)
            
            if is_equiv:
                return True, "Answer is correct"
            
            # Try numerical comparison
            try:
                student_val = float(sp.sympify(student_answer).evalf())
                correct_val = float(sp.sympify(correct_answer).evalf())
                
                if abs(student_val - correct_val) < tolerance:
                    return True, "Answer is numerically correct"
                else:
                    return False, f"Answer is incorrect. Expected: {correct_val}, Got: {student_val}"
            except:
                return False, msg
                
        except Exception as e:
            logger.error(f"Error validating answer: {e}")
            return False, f"Could not validate answer: {str(e)}"


# Global validator instance
math_validator = MathValidator()

