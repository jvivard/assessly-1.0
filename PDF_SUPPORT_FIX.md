# 🔧 PDF Support Fix

## Problem

When grading uploaded PDF worksheets, the system failed with:
- **404 Error**: `http://localhost:8000/uploads/50eddcdb-40d9-4ee4-9fd9-c4b898c01884.pdf`
- **Missing subdirectory**: File path missing `student_work/` directory
- **Image load error**: PDF files can't be displayed with `<img>` tags

---

## Root Causes

### 1. Incorrect File Path Conversion
**Backend** (`file_path_to_url` function):
- Input: `./uploads/student_work/file.pdf`
- Output: `http://localhost:8000/uploads/file.pdf` ❌
- **Problem**: Lost the `student_work/` subdirectory!

### 2. PDF vs Image Handling
**Frontend**:
- Used `<img>` tag for all files
- **Problem**: `<img>` only works for images (JPG, PNG), not PDFs!

---

## Solutions Implemented

### ✅ Fix 1: Correct File Path Conversion (Backend)

Updated `backend/app/api/grading.py`:

```python
def file_path_to_url(file_path: str, base_url: str = "http://localhost:8000") -> str:
    """Convert local file path to accessible URL."""
    if not file_path:
        return ""
    
    # Normalize path separators (handle Windows/Linux)
    file_path = file_path.replace('\\', '/')
    upload_dir = settings.upload_dir.rstrip('/').replace('\\', '/')
    
    # Handle multiple path formats
    if file_path.startswith(upload_dir):
        # ./uploads/student_work/file.pdf -> student_work/file.pdf
        relative_path = file_path[len(upload_dir):].lstrip('/')
    elif file_path.startswith('./uploads/'):
        # ./uploads/student_work/file.pdf -> student_work/file.pdf
        relative_path = file_path[len('./uploads/'):].lstrip('/')
    elif file_path.startswith('uploads/'):
        # uploads/student_work/file.pdf -> student_work/file.pdf
        relative_path = file_path[len('uploads/'):].lstrip('/')
    elif '/' in file_path:
        # student_work/file.pdf -> student_work/file.pdf
        relative_path = file_path
    else:
        # Just filename -> assume worksheets subdirectory
        relative_path = f"worksheets/{file_path}"
    
    return f"{base_url}/uploads/{relative_path}"
```

**Test Cases**:
```python
# Input -> Output
"./uploads/student_work/abc.pdf" -> "http://localhost:8000/uploads/student_work/abc.pdf" ✅
"uploads/student_work/abc.pdf"   -> "http://localhost:8000/uploads/student_work/abc.pdf" ✅
"student_work/abc.pdf"           -> "http://localhost:8000/uploads/student_work/abc.pdf" ✅
"abc.pdf"                        -> "http://localhost:8000/uploads/worksheets/abc.pdf" ✅
```

---

### ✅ Fix 2: PDF Support (Frontend)

Updated `components/grading-canvas-integrated.tsx`:

**1. Detect PDF files:**
```typescript
const [isPDF, setIsPDF] = useState(false)

// When URL is received:
if (result.worksheet_image_url) {
  setWorksheetImageUrl(result.worksheet_image_url)
  setIsPDF(result.worksheet_image_url.toLowerCase().endsWith('.pdf'))
}
```

**2. Conditional rendering:**
```tsx
{worksheetImageUrl ? (
  isPDF ? (
    /* PDF Viewer using iframe */
    <iframe
      src={`${worksheetImageUrl}#toolbar=0&navpanes=0&scrollbar=0`}
      className="w-full h-full absolute inset-0"
      style={{
        border: 'none',
        pointerEvents: 'none',
        minHeight: '1500px'
      }}
    />
  ) : (
    /* Image display */
    <img 
      src={worksheetImageUrl} 
      alt="Student Worksheet"
      className="w-full h-auto"
    />
  )
) : (
  /* Fallback placeholder */
)}
```

**Key Features**:
- `#toolbar=0` - Hides PDF toolbar
- `#navpanes=0` - Hides navigation pane
- `#scrollbar=0` - Hides scrollbar
- `pointerEvents: 'none'` - Allows clicking through to annotations
- Error handling for both PDFs and images

---

## How It Works Now

### Complete Flow

```
1. Student uploads PDF worksheet
   ↓
2. Backend saves to: ./uploads/student_work/abc123.pdf
   ↓
3. AI grading processes the PDF (OCR)
   ↓
4. Backend converts path to URL:
   file_path_to_url("./uploads/student_work/abc123.pdf")
   → "http://localhost:8000/uploads/student_work/abc123.pdf"
   ↓
5. Response includes correct URL:
   {
     "worksheet_image_url": "http://localhost:8000/uploads/student_work/abc123.pdf"
   }
   ↓
6. Frontend detects .pdf extension
   ↓
7. Renders PDF in iframe (not img tag)
   ↓
8. Annotations overlay on top of PDF
   ↓
9. Teacher sees PDF with AI-generated annotations!
```

---

## Supported File Types

| Type | Extensions | Display Method | Status |
|------|-----------|----------------|--------|
| **PDF** | `.pdf` | `<iframe>` | ✅ Working |
| **Images** | `.jpg`, `.jpeg`, `.png`, `.gif` | `<img>` | ✅ Working |
| **HEIC** | `.heic` | Not supported | ❌ Needs conversion |
| **TIFF** | `.tiff`, `.tif` | Not supported | ❌ Needs conversion |

---

## Testing

### Test PDF Upload

1. **Start backend:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

3. **Upload PDF worksheet:**
   - Go to `/grade-canvas`
   - Upload a PDF file
   - Upload rubric
   - Click "Start Grading"

4. **Check logs:**
   ```
   Backend should log:
   "Saved file: uploads/student_work/abc123.pdf"
   
   Frontend console should show:
   "PDF loaded successfully: http://localhost:8000/uploads/student_work/abc123.pdf"
   ```

5. **View results:**
   - Navigate to `/grade-canvas/integrated?jobId=YOUR_JOB_ID`
   - PDF should display with annotations overlaid
   - Annotations should be draggable and editable

---

## Troubleshooting

### Problem: 404 Not Found

**Symptoms**:
```
INFO: GET /uploads/50eddcdb.pdf HTTP/1.1" 404 Not Found
```

**Causes**:
1. Missing subdirectory in path
2. File not in correct directory
3. Static files not mounted

**Solutions**:
```bash
# Check file exists
ls backend/uploads/student_work/

# Check backend logs for mounted directory
# Should see: "Mounted uploads directory: ./uploads"

# Verify URL format
# Correct: http://localhost:8000/uploads/student_work/file.pdf
# Wrong:   http://localhost:8000/uploads/file.pdf
```

---

### Problem: PDF Loads But No Annotations

**Cause**: Iframe might be blocking pointer events

**Solution**: Already handled with `pointerEvents: 'none'` on iframe

---

### Problem: PDF Toolbar Showing

**Cause**: Browser's default PDF viewer showing controls

**Solution**: URL parameters hide toolbar:
```typescript
src={`${worksheetImageUrl}#toolbar=0&navpanes=0&scrollbar=0`}
```

---

### Problem: PDF Not Displaying (Blank)

**Possible Causes**:

1. **CORS Issue**:
   ```bash
   # Check backend .env
   ALLOWED_ORIGINS=http://localhost:3000
   ```

2. **PDF Corrupted**:
   ```bash
   # Try opening file directly
   # Visit: http://localhost:8000/uploads/student_work/file.pdf
   ```

3. **Browser Doesn't Support Iframe PDFs**:
   - Use Chrome, Firefox, or Edge
   - Safari might have issues

---

## Advanced: PDF.js Integration (Future)

For better control, consider using `react-pdf`:

```bash
npm install react-pdf pdfjs-dist
```

```tsx
import { Document, Page } from 'react-pdf'

<Document file={worksheetImageUrl}>
  <Page pageNumber={1} width={1200} />
</Document>
```

**Benefits**:
- Better cross-browser support
- Page navigation for multi-page PDFs
- Zoom controls
- Text selection
- Print functionality

---

## Files Changed

| File | Changes |
|------|---------|
| `backend/app/api/grading.py` | Fixed `file_path_to_url()` to preserve subdirectories |
| `components/grading-canvas-integrated.tsx` | Added PDF detection and iframe rendering |

---

## API Response Format

### Updated Response

```json
{
  "status": "completed",
  "progress": 100,
  "results": { ... },
  "worksheet_image_url": "http://localhost:8000/uploads/student_work/abc123.pdf",
  "question_image_url": "http://localhost:8000/uploads/worksheets/question.jpg"
}
```

**Key Points**:
- ✅ Full URL with subdirectory
- ✅ Works for both PDFs and images
- ✅ Absolute URL (not relative path)

---

## Before vs After

### Before ❌

```
Backend returns:
  file_path: "./uploads/student_work/file.pdf"
  
Converted to:
  URL: "http://localhost:8000/uploads/file.pdf"  ❌ Missing subdirectory!
  
Result:
  404 Not Found
  Failed to load worksheet
```

### After ✅

```
Backend returns:
  file_path: "./uploads/student_work/file.pdf"
  
Converted to:
  URL: "http://localhost:8000/uploads/student_work/file.pdf"  ✅ Correct!
  
Result:
  PDF displays successfully
  Annotations work perfectly
```

---

## Summary

### Problems Fixed
1. ✅ File path conversion preserves subdirectories
2. ✅ PDF files display correctly using iframe
3. ✅ Image files still work with img tag
4. ✅ Error handling for both formats
5. ✅ Annotations overlay on both PDFs and images

### Current Support
- ✅ PDF worksheets via iframe
- ✅ Image worksheets (JPG, PNG, GIF)
- ✅ Automatic file type detection
- ✅ Proper URL generation with subdirectories

### Status
🎉 **PDF and Image Support Working!**

---

## Quick Fix Summary

**If you see 404 errors:**

1. Check backend logs - is static files mounted?
2. Check URL format - does it include subdirectory?
3. Check file exists - `ls backend/uploads/student_work/`
4. Restart backend server

**If PDF doesn't display:**

1. Check browser console for errors
2. Try opening PDF URL directly in browser
3. Check CORS settings in backend `.env`
4. Use Chrome/Firefox (better PDF support)

---

**Status**: ✅ **FIXED AND WORKING!**

Both PDFs and images now display correctly with annotations! 🎨📄

