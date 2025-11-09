"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, CheckCircle2, Sparkles, FileCheck } from "lucide-react"
import { useRouter } from "next/navigation"

type GradingMode = "smart" | "standard"
type AssessmentType = "exam" | "quiz" | "assignment" | "class-activity"

export function GradeCanvasContent() {
  const [step, setStep] = useState<1 | 2>(1)
  const [gradingMode, setGradingMode] = useState<GradingMode | null>(null)
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("assignment")
  const [assessmentName, setAssessmentName] = useState("")
  const [className, setClassName] = useState("")
  const [questionsFile, setQuestionsFile] = useState<File | null>(null)
  const [rubricFile, setRubricFile] = useState<File | null>(null)
  const [studentFiles, setStudentFiles] = useState<File[]>([])
  const router = useRouter()

  const handleQuestionsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setQuestionsFile(e.target.files[0])
    }
  }

  const handleRubricUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRubricFile(e.target.files[0])
    }
  }

  const handleStudentFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setStudentFiles(Array.from(e.target.files))
    }
  }

  const canProceedToStep2 = questionsFile && rubricFile

  const handleStartGrading = () => {
    router.push("/grade-canvas/editor")
  }

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
                <CardTitle>Standard Mode</CardTitle>
              </div>
              <CardDescription>Quick grading with rubric-based scoring and basic feedback</CardDescription>
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
              <div className="grid md:grid-cols-2 gap-4">
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
                  <Label htmlFor="assessment-name">Assessment Name (Optional)</Label>
                  <Input
                    id="assessment-name"
                    placeholder="e.g., Chapter 5 Test"
                    value={assessmentName}
                    onChange={(e) => setAssessmentName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to extract from PDF</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class-name">Class Name (Optional)</Label>
                <Input
                  id="class-name"
                  placeholder="e.g., AP Calculus BC"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave blank to extract from PDF</p>
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
                {questionsFile ? (
                  <div className="flex items-center justify-center gap-3 text-primary">
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                      <p className="font-medium">{questionsFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(questionsFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="questions-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Click to upload questions PDF</p>
                    <p className="text-xs text-muted-foreground">PDF up to 10MB</p>
                    <input
                      id="questions-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleQuestionsUpload}
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
              <CardDescription>Upload the grading rubric or answer key PDF</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                {rubricFile ? (
                  <div className="flex items-center justify-center gap-3 text-primary">
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                      <p className="font-medium">{rubricFile.name}</p>
                      <p className="text-sm text-muted-foreground">{(rubricFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="rubric-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Click to upload rubric PDF</p>
                    <p className="text-xs text-muted-foreground">PDF up to 10MB</p>
                    <input
                      id="rubric-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleRubricUpload}
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
                {studentFiles.length > 0 ? (
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
                        </div>
                      ))}
                    </div>
                    <label htmlFor="student-files-upload" className="inline-block">
                      <Button variant="outline" size="sm" asChild>
                        <span>Upload More Files</span>
                      </Button>
                      <input
                        id="student-files-upload"
                        type="file"
                        accept=".pdf"
                        multiple
                        className="hidden"
                        onChange={handleStudentFilesUpload}
                      />
                    </label>
                  </div>
                ) : (
                  <label htmlFor="student-files-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Click to upload student worksheets</p>
                    <p className="text-xs text-muted-foreground">Select multiple PDF files (up to 10MB each)</p>
                    <input
                      id="student-files-upload"
                      type="file"
                      accept=".pdf"
                      multiple
                      className="hidden"
                      onChange={handleStudentFilesUpload}
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
            <Button size="lg" disabled={studentFiles.length === 0} onClick={handleStartGrading}>
              Start Grading ({studentFiles.length} {studentFiles.length === 1 ? "worksheet" : "worksheets"})
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
