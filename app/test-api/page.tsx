'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestAPIPage() {
  const [backendStatus, setBackendStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rubrics, setRubrics] = useState<any[]>([]);

  // Check backend health on mount
  useEffect(() => {
    checkHealth();
    loadRubrics();
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const status = await apiClient.healthCheck();
      setBackendStatus(status);
    } catch (error) {
      setBackendStatus({ status: 'error', error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const loadRubrics = async () => {
    try {
      const data = await apiClient.listRubrics();
      setRubrics(data.rubrics);
    } catch (error) {
      console.error('Failed to load rubrics:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'rubric' | 'student_work') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await apiClient.uploadFile(file, type, 'math');
      alert(`File uploaded successfully!\nFile ID: ${result.file_id}`);
      
      if (type === 'rubric') {
        // Auto-parse the rubric
        const rubric = await apiClient.parseRubric(result.file_path, file.name, 'math');
        alert(`Rubric parsed!\nID: ${rubric.id}\nQuestions: ${rubric.criteria?.questions?.length || 0}`);
        loadRubrics();
      }
    } catch (error) {
      alert(`Upload failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Assesly API Test Page</h1>
        <p className="text-muted-foreground">
          Test the connection between frontend and backend
        </p>
      </div>

      {/* Backend Status */}
      <Card>
        <CardHeader>
          <CardTitle>Backend Status</CardTitle>
          <CardDescription>Connection to http://localhost:8000</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p>Checking...</p>}
          {backendStatus && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Status:</span>
                <Badge variant={backendStatus.status === 'healthy' ? 'default' : 'destructive'}>
                  {backendStatus.status === 'healthy' ? '✅ Connected' : '❌ Error'}
                </Badge>
              </div>
              {backendStatus.database && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Database:</span>
                  <Badge variant="outline">{backendStatus.database}</Badge>
                </div>
              )}
              {backendStatus.redis && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Redis:</span>
                  <Badge variant="outline">{backendStatus.redis}</Badge>
                </div>
              )}
              {backendStatus.error && (
                <div className="text-red-500 text-sm mt-2">
                  Error: {backendStatus.error}
                </div>
              )}
            </div>
          )}
          <Button onClick={checkHealth} className="mt-4" disabled={loading}>
            Refresh Status
          </Button>
        </CardContent>
      </Card>

      {/* Upload Rubric */}
      <Card>
        <CardHeader>
          <CardTitle>Upload & Parse Rubric</CardTitle>
          <CardDescription>Upload a rubric PDF - AI will parse it automatically</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept=".pdf,.jpg,.png"
            onChange={(e) => handleFileUpload(e, 'rubric')}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </CardContent>
      </Card>

      {/* Upload Student Work */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Student Work</CardTitle>
          <CardDescription>Upload a student answer (PDF/image)</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept=".pdf,.jpg,.png"
            onChange={(e) => handleFileUpload(e, 'student_work')}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        </CardContent>
      </Card>

      {/* Existing Rubrics */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Rubrics</CardTitle>
          <CardDescription>Rubrics stored in the database</CardDescription>
        </CardHeader>
        <CardContent>
          {rubrics.length === 0 ? (
            <p className="text-muted-foreground">No rubrics found. Upload one above!</p>
          ) : (
            <div className="space-y-2">
              {rubrics.map((rubric) => (
                <div key={rubric.id} className="border rounded p-3">
                  <div className="font-semibold">{rubric.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Subject: {rubric.subject} | ID: {rubric.id}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button onClick={loadRubrics} className="mt-4" variant="outline">
            Refresh List
          </Button>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              🔗 Backend API Docs
            </a>
          </div>
          <div>
            <a href="http://localhost:8000/health" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              🔗 Backend Health Check
            </a>
          </div>
          <div>
            <a href="http://localhost:5555" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              🔗 Celery Task Monitor (Flower)
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

