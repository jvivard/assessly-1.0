"""Validate Assesly backend setup."""

import sys
import os
from typing import List, Tuple

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def check_python_version() -> Tuple[bool, str]:
    """Check Python version."""
    version = sys.version_info
    if version.major >= 3 and version.minor >= 11:
        return True, f"✓ Python {version.major}.{version.minor}.{version.micro}"
    return False, f"✗ Python {version.major}.{version.minor} (need 3.11+)"


def check_dependencies() -> Tuple[bool, str]:
    """Check if required packages are installed."""
    required_packages = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "psycopg2",
        "redis",
        "celery",
        "openai",
        "google.generativeai",
        "loguru"
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        return False, f"✗ Missing packages: {', '.join(missing)}"
    return True, "✓ All required packages installed"


def check_env_file() -> Tuple[bool, str]:
    """Check if .env file exists."""
    if os.path.exists(".env"):
        return True, "✓ .env file exists"
    return False, "✗ .env file not found (copy from .env.example)"


def check_env_variables() -> List[Tuple[bool, str]]:
    """Check if required environment variables are set."""
    from dotenv import load_dotenv
    load_dotenv()
    
    results = []
    
    # Check OpenAI API key
    openai_key = os.getenv("OPENAI_API_KEY", "")
    if openai_key and openai_key != "sk-your-openai-key-here":
        results.append((True, "✓ OPENAI_API_KEY configured"))
    else:
        results.append((False, "✗ OPENAI_API_KEY not configured"))
    
    # Check Gemini API key
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key and gemini_key != "your-gemini-key-here":
        results.append((True, "✓ GEMINI_API_KEY configured"))
    else:
        results.append((False, "✗ GEMINI_API_KEY not configured"))
    
    # Check Database URL
    db_url = os.getenv("DATABASE_URL", "")
    if db_url:
        results.append((True, "✓ DATABASE_URL configured"))
    else:
        results.append((False, "✗ DATABASE_URL not configured"))
    
    # Check Redis URL
    redis_url = os.getenv("REDIS_URL", "")
    if redis_url:
        results.append((True, "✓ REDIS_URL configured"))
    else:
        results.append((False, "✗ REDIS_URL not configured"))
    
    return results


def check_database_connection() -> Tuple[bool, str]:
    """Check if database is accessible."""
    try:
        from app.config import settings
        from sqlalchemy import create_engine
        
        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        
        return True, "✓ Database connection successful"
    except Exception as e:
        return False, f"✗ Database connection failed: {str(e)}"


def check_redis_connection() -> Tuple[bool, str]:
    """Check if Redis is accessible."""
    try:
        import redis
        from app.config import settings
        
        r = redis.from_url(settings.redis_url)
        r.ping()
        
        return True, "✓ Redis connection successful"
    except Exception as e:
        return False, f"✗ Redis connection failed: {str(e)}"


def check_directory_structure() -> Tuple[bool, str]:
    """Check if required directories exist."""
    required_dirs = [
        "app",
        "app/api",
        "app/models",
        "app/services",
        "app/utils",
        "alembic",
        "scripts"
    ]
    
    missing = [d for d in required_dirs if not os.path.isdir(d)]
    
    if missing:
        return False, f"✗ Missing directories: {', '.join(missing)}"
    return True, "✓ All required directories exist"


def main():
    """Run all validation checks."""
    print("=" * 60)
    print("Assesly Backend Setup Validation")
    print("=" * 60)
    print()
    
    all_passed = True
    
    # Basic checks
    print("📋 Basic Checks")
    print("-" * 60)
    
    checks = [
        check_python_version(),
        check_dependencies(),
        check_env_file(),
        check_directory_structure()
    ]
    
    for passed, message in checks:
        print(message)
        if not passed:
            all_passed = False
    
    print()
    
    # Environment variables
    print("🔑 Environment Variables")
    print("-" * 60)
    
    env_checks = check_env_variables()
    for passed, message in env_checks:
        print(message)
        if not passed:
            all_passed = False
    
    print()
    
    # Service connections
    print("🔌 Service Connections")
    print("-" * 60)
    
    db_check = check_database_connection()
    redis_check = check_redis_connection()
    
    for passed, message in [db_check, redis_check]:
        print(message)
        if not passed:
            all_passed = False
    
    print()
    print("=" * 60)
    
    if all_passed:
        print("✅ All checks passed! You're ready to start Assesly!")
        print()
        print("Next steps:")
        print("  1. Run: uvicorn app.main:app --reload")
        print("  2. Visit: http://localhost:8000/docs")
        print("  3. Start grading!")
        return 0
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        print()
        print("Common fixes:")
        print("  - Install dependencies: pip install -r requirements.txt")
        print("  - Configure .env: cp .env.example .env")
        print("  - Start PostgreSQL: sudo service postgresql start")
        print("  - Start Redis: redis-server")
        return 1


if __name__ == "__main__":
    sys.exit(main())

