/**
 * API Client for Assesly Backend
 */

import { API_BASE_URL, API_ENDPOINTS, WS_BASE_URL } from './api-config';

// Types
export interface UploadResponse {
  file_id: string;
  status: string;
  file_name: string;
  file_path: string;
  worksheet_id?: number;
}

export interface Rubric {
  id: number;
  name: string;
  subject: string;
  criteria: any;
  created_at: string;
}

// Response shape from POST /api/upload/parse-rubric
export interface ParseRubricResponse {
  rubric_id: number;
  name: string;
  subject: string | null;
  criteria: any;
  status: string;
}

export interface GradeRequest {
  question_file_path: string;
  rubric_id: number;
  student_work_file_path: string;
  student_name?: string;
  question_text?: string;
}

export interface GradeResponse {
  job_id: string;
  status: string;
}

export interface GradingResult {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  results?: {
    score: number;
    max_points: number;
    feedback: string;
    strengths?: string[];
    weaknesses?: string[];
    step_analysis?: string;
  };
}

/**
 * API Client Class
 */
export class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch wrapper
   */
  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.fetch<{ status: string; database: string; redis: string }>(
      API_ENDPOINTS.health
    );
  }

  /**
   * Upload a file
   */
  async uploadFile(
    file: File,
    fileType: 'worksheet' | 'rubric' | 'student_work',
    subject?: string
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    if (subject) {
      formData.append('subject', subject);
    }

    return this.fetch<UploadResponse>(API_ENDPOINTS.upload, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Parse a rubric
   */
  async parseRubric(filePath: string, name: string, subject?: string) {
    return this.fetch<ParseRubricResponse>(API_ENDPOINTS.parseRubric, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath, name, subject }),
    });
  }

  /**
   * List all rubrics
   */
  async listRubrics(): Promise<{ rubrics: Rubric[] }> {
    return this.fetch(API_ENDPOINTS.listRubrics);
  }

  /**
   * Get a specific rubric
   */
  async getRubric(id: number): Promise<Rubric> {
    return this.fetch(API_ENDPOINTS.getRubric(id));
  }

  /**
   * Submit work for grading
   */
  async gradeSubmission(request: GradeRequest): Promise<GradeResponse> {
    return this.fetch<GradeResponse>(API_ENDPOINTS.grade, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  /**
   * Get grading results
   */
  async getGradingResults(jobId: string): Promise<GradingResult> {
    return this.fetch<GradingResult>(API_ENDPOINTS.getResults(jobId));
  }

  /**
   * Create WebSocket connection for real-time grading updates
   */
  createGradingWebSocket(
    jobId: string,
    onMessage: (data: GradingResult) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ): WebSocket {
    const url = `${WS_BASE_URL}${API_ENDPOINTS.gradingWebSocket(jobId)}`;
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onerror = (error) => {
      // Suppress error - polling fallback handles it
      onError?.(error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      onClose?.();
    };

    return ws;
  }

  /**
   * Save annotations for a graded worksheet
   */
  async saveAnnotations(jobId: string, annotations: any[], worksheetId?: number): Promise<any> {
    return this.fetch(API_ENDPOINTS.saveAnnotations, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        worksheet_id: worksheetId,
        annotations: annotations
      }),
    });
  }

  /**
   * Get saved annotations for a job
   */
  async getAnnotations(jobId: string): Promise<any> {
    return this.fetch(API_ENDPOINTS.getAnnotations(jobId));
  }

  /**
   * Mark grading as complete and save to database
   */
  async completeGrading(jobId: string): Promise<any> {
    return this.fetch(API_ENDPOINTS.completeGrading, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId })
    });
  }

  /**
   * Get all classes and their grades
   */
  async getClasses(): Promise<any> {
    return this.fetch(API_ENDPOINTS.getClasses);
  }

  /**
   * Get grades for a specific class and subject
   */
  async getClassGrades(classSection: string, subject: string): Promise<any> {
    return this.fetch(API_ENDPOINTS.getClassGrades(classSection, subject));
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export default
export default apiClient;

