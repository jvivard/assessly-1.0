/**
 * API Configuration for Assesly Backend
 */

// Backend API base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// WebSocket base URL
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

// API endpoints
export const API_ENDPOINTS = {
  // Health check
  health: '/health',
  
  // Upload endpoints
  upload: '/api/upload',
  parseRubric: '/api/upload/parse-rubric',
  listRubrics: '/api/upload/rubrics',
  getRubric: (id: number) => `/api/upload/rubrics/${id}`,
  
  // Grading endpoints
  grade: '/api/grading/grade',
  gradeBulk: '/api/grading/grade-bulk',
  getResults: (jobId: string) => `/api/grading/results/${jobId}`,
  getWorksheetGrades: (worksheetId: number) => `/api/grading/grades/worksheet/${worksheetId}`,
  
  // Annotation endpoints
  saveAnnotations: '/api/grading/annotations/save',
  getAnnotations: (jobId: string) => `/api/grading/annotations/${jobId}`,
  
  // Complete grading
  completeGrading: '/api/grading/complete',
  
  // Classes endpoints
  getClasses: '/api/grading/classes',
  getClassGrades: (classSection: string, subject: string) => 
    `/api/grading/classes/${encodeURIComponent(classSection)}/${encodeURIComponent(subject)}`,
  
  // WebSocket endpoints
  gradingWebSocket: (jobId: string) => `/ws/grading/${jobId}`,
} as const;

export default API_ENDPOINTS;

