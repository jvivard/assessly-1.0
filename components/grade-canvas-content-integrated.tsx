"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, CheckCircle2, Sparkles, FileCheck, Loader2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

type GradingMode = "smart" | "standard"
type AssessmentType = "exam" | "quiz" | "assignment" | "class-activity"

export function GradeCanvasContentIntegrated() {
  const [step, setStep] = useState<1 | 2>(1)
  const [gradingMode, setGradingMode] = useState<GradingMode | null>(null)
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("assignment")
  const [assessmentName, setAssessmentName] = useState("")
  const [className, setClassName] = useState("")
  const [subject, setSubject] = useState("math")
  
  // Files
  const [questionsFile, setQuestionsFile] = useState<File | null>(null)
  const [rubricFile, setRubricFile] = useState<File | null>(null)
  const [studentFiles, setStudentFiles] = useState<File[]>([])
  
  // Backend data
  const [questionFilePath, setQuestionFilePath] = useState<string>("")
  const [rubricId, setRubricId] = useState<number | null>(null)
  const [studentFilePaths, setStudentFilePaths] = useState<string[]>([])
  
  // Loading states
  const [uploadingQuestions, setUploadingQuestions] = useState(false)
  const [uploadingRubric, setUploadingRubric] = useState(false)
  const [uploadingStudents, setUploadingStudents] = useState(false)
  const [startingGrading, setStartingGrading] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()

  // =============== STEP 1: Upload Questions ===============
  const handleQuestionsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setQuestionsFile(file)
    setUploadingQuestions(true)

    try {
      // Upload to backend
      const result = await apiClient.uploadFile(file, 'worksheet', subject)
      setQuestionFilePath(result.file_path)
      
      toast({
        title: "Questions uploaded!",
        description: `${file.name} uploaded successfully`,
      })
    } catch (error) {
      toast({
        title: "Upload failed",
        description: String(error),
        variant: "destructive"
      })
      setQuestionsFile(null)
    } finally {
      setUploadingQuestions(false)
    }
  }

  // =============== STEP 1: Upload & Parse Rubric ===============
  const handleRubricUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setRubricFile(file)
    setUploadingRubric(true)

    try {
      // 1. Upload file
      const uploadResult = await apiClient.uploadFile(file, 'rubric', subject)
      
      toast({
        title: "Rubric uploaded!",
        description: "Parsing rubric with AI...",
      })

      // 2. Parse rubric with AI
      const rubric = await apiClient.parseRubric(
        uploadResult.file_path,
        assessmentName || file.name,
        subject
      )
      // parse-rubric returns { rubric_id, ... } (fallback to id)
      const newId = (rubric as any)?.rubric_id ?? (rubric as any)?.id
      if (newId) {
        setRubricId(Number(newId))
      } else {
        console.warn("Rubric parsed but no ID returned", rubric)
      }
      
      toast({
        title: "Rubric parsed!",
        description: `Found ${rubric.criteria?.questions?.length || 0} questions`,
      })
    } catch (error) {
      toast({
        title: "Rubric processing failed",
        description: String(error),
        variant: "destructive"
      })
      setRubricFile(null)
    } finally {
      setUploadingRubric(false)
    }
  }

  // =============== STEP 2: Upload Student Work ===============
  const handleStudentFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingStudents(true)
    const newFiles = Array.from(files)
    const uploadedPaths: string[] = []

    try {
      // Upload each file
      for (const file of newFiles) {
        const result = await apiClient.uploadFile(file, 'student_work', subject)
        uploadedPaths.push(result.file_path)
      }

      setStudentFiles([...studentFiles, ...newFiles])
      setStudentFilePaths([...studentFilePaths, ...uploadedPaths])
      
      toast({
        title: "Student work uploaded!",
        description: `${newFiles.length} file(s) uploaded successfully`,
      })
    } catch (error) {
      toast({
        title: "Upload failed",
        description: String(error),
        variant: "destructive"
      })
    } finally {
      setUploadingStudents(false)
    }
  }

  // =============== Remove File Handlers ===============
  const handleRemoveQuestionsFile = () => {
    setQuestionsFile(null)
    setQuestionFilePath("")
    toast({
      title: "Questions file removed",
      description: "You can upload a new file",
    })
  }

  const handleRemoveRubricFile = () => {
    setRubricFile(null)
    setRubricId(null)
    toast({
      title: "Rubric file removed",
      description: "You can upload a new file",
    })
  }

  const handleRemoveStudentFile = (index: number) => {
    const removedFile = studentFiles[index]
    const newStudentFiles = studentFiles.filter((_, i) => i !== index)
    const newStudentFilePaths = studentFilePaths.filter((_, i) => i !== index)
    
    setStudentFiles(newStudentFiles)
    setStudentFilePaths(newStudentFilePaths)
    
    toast({
      title: "File removed",
      description: `${removedFile.name} removed from upload list`,
    })
  }

  // =============== Start AI Grading ===============
  const handleStartGrading = async () => {
    console.log("🟢 Start Grading clicked")
    toast({ title: "Starting…", description: "Validating inputs" })
    const missing: string[] = []
    if (!questionFilePath) missing.push("Questions PDF")
    if (!rubricId) missing.push("Parsed rubric")
    if (studentFilePaths.length === 0) missing.push("At least one student worksheet")

    if (missing.length > 0) {
      toast({
        title: "Can't start grading",
        description: `Missing: ${missing.join(", ")}`,
        variant: "destructive"
      })
      console.warn("Start grading blocked. Missing:", missing)
      return
    }

    setStartingGrading(true)

    try {
      console.log("📨 Calling /api/grading/grade with:", {
        question_file_path: questionFilePath,
        rubric_id: rubricId,
        student_work_file_path: studentFilePaths[0],
        student_name: studentFiles[0]?.name
      })
      // Submit first student for grading (for demo)
      const result = await apiClient.gradeSubmission({
        question_file_path: questionFilePath,
        rubric_id: rubricId,
        student_work_file_path: studentFilePaths[0],
        student_name: studentFiles[0].name.replace('.pdf', ''),
      })

      console.log("✅ Grading job started:", result)
      toast({
        title: "Grading started!",
        description: `Job ID: ${result.job_id}`,
      })

      // Navigate to editor page with job ID
      router.push(`/grade-canvas/editor?jobId=${result.job_id}`)
    } catch (error) {
      toast({
        title: "Grading failed",
        description: String(error),
        variant: "destructive"
      })
    } finally {
      setStartingGrading(false)
    }
  }

  const canProceedToStep2 = questionsFile && rubricFile && !uploadingQuestions && !uploadingRubric
  const canStartGrading = studentFiles.length > 0 && !uploadingStudents

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">GradeCanvas</h1>
        <p className="text-muted-foreground">AI-powered grading for all your assessments</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step === 1 ? "text-primary" : "text-muted-foreground"}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step === 1 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            1
          </div>
          <span className="font-medium">Upload Questions & Rubric</span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className={`flex items-center gap-2 ${step === 2 ? "text-primary" : "text-muted-foreground"}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              step === 2 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            2
          </div>
          <span className="font-medium">Upload Student Worksheets</span>
        </div>
      </div>

      {/* Grading Mode Selection */}
      {!gradingMode && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setGradingMode("smart")}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <CardTitle>Smart Mode</CardTitle>
              </div>
              <CardDescription>
                AI extracts questions from your PDF and provides intelligent grading with detailed feedback
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setGradingMode("standard")}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-secondary-foreground" />
                </div>
                <CardTitle>Feedback Mode</CardTitle>
              </div>
              <CardDescription>Quick feedback for already corrected papers with AI-powered insights</CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Step 1: Upload Questions & Rubric */}
      {gradingMode && step === 1 && (
        <div className="space-y-6">
          {/* Assessment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
              <CardDescription>Provide information about this assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger id="subject">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="math">Math</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="history">History</SelectItem>
                      <SelectItem value="computer-science">Computer Science</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessment-type">Assessment Type</Label>
                  <Select value={assessmentType} onValueChange={(value: AssessmentType) => setAssessmentType(value)}>
                    <SelectTrigger id="assessment-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="class-activity">Class Activity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessment-name">Assessment Name</Label>
                  <Input
                    id="assessment-name"
                    placeholder="e.g., Chapter 5 Test"
                    value={assessmentName}
                    onChange={(e) => setAssessmentName(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Questions</CardTitle>
              <CardDescription>Upload the PDF containing the questions for this assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                {uploadingQuestions ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading questions...</p>
                  </div>
                ) : questionsFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-3 text-primary">
                      <CheckCircle2 className="w-6 h-6" />
                      <div>
                        <p className="font-medium">{questionsFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(questionsFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={handleRemoveQuestionsFile}
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="questions-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Click to upload questions PDF</p>
                    <p className="text-xs text-muted-foreground">PDF up to 10MB</p>
                    <input
                      id="questions-upload"
                      type="file"
                      accept=".pdf,.jpg,.png"
                      className="hidden"
                      onChange={handleQuestionsUpload}
                      disabled={uploadingQuestions}
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upload Rubric */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Rubric</CardTitle>
              <CardDescription>Upload the grading rubric or answer key PDF - AI will parse it automatically</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                {uploadingRubric ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading & parsing rubric with AI...</p>
                  </div>
                ) : rubricFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-3 text-primary">
                        <CheckCircle2 className="w-6 h-6" />
                        <div>
                          <p className="font-medium">{rubricFile.name}</p>
                          <p className="text-sm text-muted-foreground">{(rubricFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={handleRemoveRubricFile}
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {rubricId && (
                      <p className="text-xs text-green-600">✓ Rubric parsed successfully (ID: {rubricId})</p>
                    )}
                  </div>
                ) : (
                  <label htmlFor="rubric-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Click to upload rubric PDF</p>
                    <p className="text-xs text-muted-foreground">PDF up to 10MB - will be parsed with AI</p>
                    <input
                      id="rubric-upload"
                      type="file"
                      accept=".pdf,.jpg,.png"
                      className="hidden"
                      onChange={handleRubricUpload}
                      disabled={uploadingRubric}
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg" disabled={!canProceedToStep2} onClick={() => setStep(2)}>
              Continue to Step 2
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Upload Student Worksheets */}
      {gradingMode && step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Student Worksheets</CardTitle>
              <CardDescription>Upload multiple student worksheets to grade them all at once</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                {uploadingStudents ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading student work...</p>
                  </div>
                ) : studentFiles.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3 text-primary mb-4">
                      <CheckCircle2 className="w-6 h-6" />
                      <p className="font-medium">{studentFiles.length} files uploaded</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {studentFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-left p-2 bg-muted rounded">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveStudentFile(index)}
                            title="Remove file"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <label htmlFor="student-files-upload" className="inline-block">
                      <Button variant="outline" size="sm" asChild disabled={uploadingStudents}>
                        <span>Upload More Files</span>
                      </Button>
                      <input
                        id="student-files-upload"
                        type="file"
                        accept=".pdf,.jpg,.png"
                        multiple
                        className="hidden"
                        onChange={handleStudentFilesUpload}
                        disabled={uploadingStudents}
                      />
                    </label>
                  </div>
                ) : (
                  <label htmlFor="student-files-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Click to upload student worksheets</p>
                    <p className="text-xs text-muted-foreground">Select multiple PDF/image files (up to 10MB each)</p>
                    <input
                      id="student-files-upload"
                      type="file"
                      accept=".pdf,.jpg,.png"
                      multiple
                      className="hidden"
                      onChange={handleStudentFilesUpload}
                      disabled={uploadingStudents}
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back to Step 1
            </Button>
            <Button 
              size="lg" 
              disabled={!canStartGrading || startingGrading} 
              onClick={handleStartGrading}
            >
              {startingGrading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting AI Grading...
                </>
              ) : (
                <>
                  Start Grading ({studentFiles.length} {studentFiles.length === 1 ? "worksheet" : "worksheets"})
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

