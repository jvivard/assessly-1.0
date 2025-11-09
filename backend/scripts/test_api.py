"""Simple API test script."""

import requests
import time
import json

BASE_URL = "http://localhost:8000"


def test_health():
    """Test health check endpoint."""
    print("Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()


def test_upload():
    """Test file upload."""
    print("Testing file upload...")
    
    # You would need an actual file for this
    # files = {'file': open('sample.pdf', 'rb')}
    # data = {'file_type': 'worksheet', 'subject': 'math'}
    # response = requests.post(f"{BASE_URL}/api/upload", files=files, data=data)
    
    print("Skipping upload test (need actual file)")
    print()


def test_list_rubrics():
    """Test listing rubrics."""
    print("Testing list rubrics...")
    response = requests.get(f"{BASE_URL}/api/upload/rubrics")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data.get('rubrics', []))} rubrics")
        print(f"Response: {json.dumps(data, indent=2)}")
    else:
        print(f"Error: {response.text}")
    print()


def test_grading_workflow():
    """Test complete grading workflow."""
    print("Testing grading workflow...")
    print("This requires uploaded files and rubrics")
    print("See README for API usage examples")
    print()


if __name__ == "__main__":
    print("=" * 60)
    print("Assesly API Tests")
    print("=" * 60)
    print()
    
    try:
        test_health()
        test_list_rubrics()
        test_grading_workflow()
        
        print("=" * 60)
        print("Tests completed!")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to API")
        print("Make sure the backend is running on http://localhost:8000")
    except Exception as e:
        print(f"Error: {e}")

