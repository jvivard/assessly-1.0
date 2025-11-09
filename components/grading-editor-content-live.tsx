"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Loader2,
  Download,
  User,
  Hash,
  Trash2,
  Plus,
  Minimize2
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

type Worksheet = {
  id: number
  name: string
  status: "pending" | "graded" | "in-progress"
}

type Question = {
  id: string
  number: string
  points: number
  earnedPoints: number
  feedback: string
  position?: { x: number; y: number }
}

// Annotation/Comment Box type
type Annotation = {
  id: string
  questionId: string
  text: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  type: "feedback" | "score" | "checkmark" | "error"
  color: string
  isEditing?: boolean
  isMinimized?: boolean
  fullText?: string
}

export function GradingEditorContentLive() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [gradingStatus, setGradingStatus] = useState<string>("processing")
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState("Starting grading...")
  const [results, setResults] = useState<any>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  
  const [currentWorksheet, setCurrentWorksheet] = useState(0)
  const [worksheets] = useState<Worksheet[]>([
    { id: 1, name: "Worksheet 1", status: "in-progress" },
  ])

  const [questions, setQuestions] = useState<Question[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [overallFeedback, setOverallFeedback] = useState("")
  
  // PDF/Image state
  const [worksheetImageUrl, setWorksheetImageUrl] = useState<string | null>(null)
  const [isPDF, setIsPDF] = useState(false)
  const [totalPages, setTotalPages] = useState(3)
  
  // Student details
  const [studentName, setStudentName] = useState("")
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [classSection, setClassSection] = useState<string | null>(null)
  const [subject, setSubject] = useState<string | null>(null)
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  
  // Calculate PDF height dynamically
  const pdfHeight = isPDF ? totalPages * 1100 : 'auto'

  // Poll for grading results
  useEffect(() => {
    if (!jobId) {
      toast({
        title: "No job ID",
        description: "Please start grading from the GradeCanvas page",
        variant: "destructive"
      })
      setLoading(false)
      return
    }

    let intervalId: NodeJS.Timeout
    let wsConnection: WebSocket | null = null

    const fetchResults = async () => {
      try {
        const result = await apiClient.getGradingResults(jobId)
        
        setGradingStatus(result.status)
        setProgress(result.progress)
        setMessage(result.message || "Processing...")
        
        // Extract student details immediately if available (even during processing)
        if (result.results) {
          if (result.results.student_name) {
            setStudentName(result.results.student_name)
          }
          if (result.results.registration_number) {
            setRegistrationNumber(result.results.registration_number)
          }
          if (result.results.class_section) {
            setClassSection(result.results.class_section)
          }
          if (result.results.subject) {
            setSubject(result.results.subject)
          }
        }
        
        if (result.status === 'completed' && result.results) {
          setResults(result.results)
          setLoading(false)
          
          // Set total pages for dynamic PDF height
          if (result.results.total_pages) {
            setTotalPages(result.results.total_pages)
          }
          
          // Set worksheet image URL
          if (result.worksheet_image_url) {
            setWorksheetImageUrl(result.worksheet_image_url)
            setIsPDF(result.worksheet_image_url.toLowerCase().endsWith('.pdf'))
          }
          
          // Check if multi-question results (new format)
          if (result.results.questions && Array.isArray(result.results.questions)) {
            // NEW: Multi-question grading results!
            const multiQuestions: Question[] = result.results.questions.map((q: any) => ({
              id: `${q.question_number}`,
              number: `${q.question_number}`,
              points: q.max_points,
              earnedPoints: q.score,
              feedback: q.feedback,
              position: q.position || { x: 150, y: 250 }
            }))
            setQuestions(multiQuestions)
            
            // Generate annotations for ALL questions
            const allAnnotations: Annotation[] = []
            result.results.questions.forEach((q: any) => {
              const question = multiQuestions.find(mq => mq.id === `${q.question_number}`)
              if (question) {
                const questionAnnotations = generateAnnotationsFromResults(q, question)
                allAnnotations.push(...questionAnnotations)
              }
            })
            console.log(`📌 Generated ${allAnnotations.length} annotations for ${multiQuestions.length} questions`)
            setAnnotations(allAnnotations)
            
            // Set overall feedback from all questions
            const overallText = result.results.questions
              .map((q: any) => `Q${q.question_number}: ${q.feedback}`)
              .join('\n\n')
            setOverallFeedback(overallText)
          } else {
            // OLD: Single question format (backward compatibility)
            const newQuestions: Question[] = [{
              id: "1",
              number: "1",
              points: result.results.max_points || result.results.total_max_points || 10,
              earnedPoints: result.results.score || result.results.total_score || 0,
              feedback: result.results.feedback || "No feedback provided",
              position: { x: 150, y: 250 }
            }]
            setQuestions(newQuestions)
            
            // Generate annotations
            const newAnnotations = generateAnnotationsFromResults(result.results, newQuestions[0])
            setAnnotations(newAnnotations)
            
            // Update overall feedback
            if (result.results.step_analysis) {
              setOverallFeedback(result.results.step_analysis)
            } else {
              setOverallFeedback(result.results.feedback)
            }
          }
          
          clearInterval(intervalId)
          if (wsConnection) {
            wsConnection.close()
          }
          
          toast({
            title: "Grading complete!",
            description: `Score: ${result.results.score}/${result.results.max_points}`
          })
        } else if (result.status === 'failed') {
          setLoading(false)
          clearInterval(intervalId)
          if (wsConnection) {
            wsConnection.close()
          }
          
          toast({
            title: "Grading failed",
            description: result.message || "An error occurred",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error("Error fetching results:", error)
      }
    }

    // Use polling (WebSocket optional)
    console.log("📊 Starting polling for job:", jobId)
    intervalId = setInterval(fetchResults, 2000)
    
    // Try WebSocket as enhancement (non-critical)
    try {
      wsConnection = apiClient.createGradingWebSocket(
        jobId,
        (data) => {
          console.log("📨 WebSocket update:", data.status, data.progress + "%")
          setGradingStatus(data.status)
          setProgress(data.progress)
          setMessage(data.message || "Processing...")
          
          // Extract student details immediately if available (even during processing)
          if (data.results) {
            if (data.results.student_name) {
              setStudentName(data.results.student_name)
            }
            if (data.results.registration_number) {
              setRegistrationNumber(data.results.registration_number)
            }
            if (data.results.class_section) {
              setClassSection(data.results.class_section)
            }
            if (data.results.subject) {
              setSubject(data.results.subject)
            }
          }
          
          if (data.status === 'completed' && data.results) {
            setResults(data.results)
            setLoading(false)
            
            // Set total pages and worksheet image URL
            if (data.results.total_pages) {
              setTotalPages(data.results.total_pages)
            }
            if (data.worksheet_image_url) {
              setWorksheetImageUrl(data.worksheet_image_url)
              setIsPDF(data.worksheet_image_url.toLowerCase().endsWith('.pdf'))
            }
            
            // Check if multi-question results (new format)
            if (data.results.questions && Array.isArray(data.results.questions)) {
              // NEW: Multi-question grading results!
              const multiQuestions: Question[] = data.results.questions.map((q: any) => ({
                id: `${q.question_number}`,
                number: `${q.question_number}`,
                points: q.max_points,
                earnedPoints: q.score,
                feedback: q.feedback,
                position: q.position || { x: 150, y: 250 }
              }))
              setQuestions(multiQuestions)
              
              // Generate annotations
              const allAnnotations: Annotation[] = []
              data.results.questions.forEach((q: any) => {
                const question = multiQuestions.find(mq => mq.id === `${q.question_number}`)
                if (question) {
                  const questionAnnotations = generateAnnotationsFromResults(q, question)
                  allAnnotations.push(...questionAnnotations)
                }
              })
              console.log(`📌 WebSocket: Generated ${allAnnotations.length} annotations`)
              setAnnotations(allAnnotations)
              
              // Set overall feedback from all questions
              const overallText = data.results.questions
                .map((q: any) => `Q${q.question_number}: ${q.feedback}`)
                .join('\n\n')
              setOverallFeedback(overallText)
            } else {
              // OLD: Single question format (backward compatibility)
              const newQuestions: Question[] = [{
                id: "1",
                number: "1",
                points: data.results.max_points || data.results.total_max_points || 10,
                earnedPoints: data.results.score || data.results.total_score || 0,
                feedback: data.results.feedback || "No feedback",
                position: { x: 150, y: 250 }
              }]
              setQuestions(newQuestions)
              
              // Generate annotations
              const newAnnotations = generateAnnotationsFromResults(data.results, newQuestions[0])
              setAnnotations(newAnnotations)
              
              if (data.results.step_analysis) {
                setOverallFeedback(data.results.step_analysis)
              } else {
                setOverallFeedback(data.results.feedback)
              }
            }
          }
        },
        () => {
          // WebSocket error - polling will handle it
          console.log("📡 WebSocket unavailable, using polling")
        }
      )
    } catch (error) {
      // WebSocket failed - polling continues
      console.log("📡 WebSocket not supported, using polling only")
    }

    // Initial fetch
    fetchResults()

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (wsConnection) wsConnection.close()
    }
  }, [jobId, toast])

  // Helper: Truncate text to N sentences
  const truncateToSentences = (text: string, maxSentences: number = 2) => {
    if (!text) return { short: "", full: text }
    
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    const short = sentences.slice(0, maxSentences).join(' ').trim()
    const full = text
    
    return {
      short: short || text.substring(0, 100) + '...',
      full: text
    }
  }

  // Helper: Generate annotations from AI results
  const generateAnnotationsFromResults = (results: any, question: Question): Annotation[] => {
    const annotations: Annotation[] = []
    const baseY = question.position?.y || 250
    
    // Score annotation
    annotations.push({
      id: `score-q${question.id}-${Date.now()}`,
      questionId: question.id,
      text: `${results.score}/${results.max_points}`,
      position: { x: 480, y: baseY + 145 },
      size: { width: 80, height: 40 },
      type: "score",
      color: results.score === results.max_points ? "green" : "blue",
      isMinimized: false
    })
    
    // Feedback annotation
    const feedbackText = truncateToSentences(results.feedback, 2)
    annotations.push({
      id: `feedback-q${question.id}-${Date.now()}`,
      questionId: question.id,
      text: feedbackText.short,
      fullText: feedbackText.full,
      position: { x: 825, y: baseY + 195 },
      size: { width: 240, height: 100 },
      type: "feedback",
      color: "red",
      isMinimized: false
    })
    
    return annotations
  }


  // Calculate totals - ALWAYS recalculate from questions array (not cached results)
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const earnedPoints = questions.reduce((sum, q) => sum + q.earnedPoints, 0)
  const percentage = totalPoints > 0 ? parseFloat(((earnedPoints / totalPoints) * 100).toFixed(1)) : 0

  const updateQuestionFeedback = (questionId: string, feedback: string) => {
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, feedback } : q)))
  }

  const updateQuestionPoints = (questionId: string, points: number) => {
    // Update question earned points
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, earnedPoints: points } : q)))
    
    // Update corresponding score annotation
    setAnnotations(annotations.map((ann) => {
      if (ann.questionId === questionId && ann.type === "score") {
        // Get the max points for this question
        const question = questions.find(q => q.id === questionId)
        const maxPoints = question?.points || 0
        return {
          ...ann,
          text: `${points}/${maxPoints}`,
          color: points === maxPoints ? "green" : "blue"
        }
      }
      return ann
    }))
  }

  const toggleMinimize = (annotationId: string) => {
    setAnnotations(annotations.map((ann) =>
      ann.id === annotationId ? { ...ann, isMinimized: !ann.isMinimized } : ann
    ))
  }

  const deleteAnnotation = (annotationId: string) => {
    setAnnotations(annotations.filter((ann) => ann.id !== annotationId))
  }

  // Save annotations and export PDF
  const exportPDF = async () => {
    toast({
      title: "Exporting PDF...",
      description: "Generating annotated PDF for download"
    })
    
    try {
      // TODO: Implement PDF export with annotations using html2canvas + jspdf
      // For now, just show a placeholder
      toast({
        title: "Feature coming soon",
        description: "PDF export with annotations will be available soon"
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export PDF",
        variant: "destructive"
      })
    }
  }

  // Complete grading and save to database
  const handleComplete = async () => {
    if (!jobId) {
      toast({
        title: "Error",
        description: "No job ID found",
        variant: "destructive"
      })
      return
    }

    setIsCompleting(true)
    try {
      const response = await apiClient.completeGrading(jobId)
      
      // Check if it's a duplicate
      if (response.is_duplicate) {
        toast({
          title: "Already Saved",
          description: response.message || `This grading has already been saved to classes: ${response.class_section} - ${response.subject}`,
          variant: "default"
        })
      } else {
        // Successfully saved (new record)
      toast({
          title: "✅ Saved to Classes!",
          description: response.message || `${response.student_name}'s worksheet saved to ${response.class_section} - ${response.subject}`,
      })
      }
      
      console.log("✅ Grading completed:", response)
      
      // Optionally navigate to classes page
      // router.push('/classes')
      
    } catch (error: any) {
      console.error("Failed to complete grading:", error)
      const errorMessage = error?.message || error?.detail || String(error)
      toast({
        title: "Failed to save",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Card className="p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">AI Grading in Progress</h3>
              <p className="text-sm text-muted-foreground mb-4">{message}</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{progress}% complete</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background">
      {/* Left Sidebar - Worksheet List */}
      <div className="w-56 border-r border-border bg-card p-4 overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Grading Session</h3>
          <p className="text-xs text-muted-foreground">{worksheets.length} worksheets</p>
        </div>

        <div className="space-y-2">
          {worksheets.map((worksheet, index) => (
            <button
              key={worksheet.id}
              onClick={() => setCurrentWorksheet(index)}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                currentWorksheet === index
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted hover:bg-muted/80 border border-transparent"
              }`}
            >
              <span className="text-sm font-medium">{worksheet.name}</span>
              {results ? (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              ) : (
                <Circle className="w-4 h-4 text-primary fill-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Center - PDF Viewer with Annotations */}
      <div className="flex-1 flex flex-col bg-muted/30">
        {/* PDF Viewer Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm font-medium">Page 1 of 1 - {worksheets[currentWorksheet].name}</span>
            <Button variant="outline" size="sm" disabled>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button 
              size="sm" 
              onClick={handleComplete}
              disabled={isCompleting || gradingStatus !== "completed"}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Complete"
              )}
            </Button>
          </div>
        </div>

        {/* PDF Canvas with Annotations */}
        <div 
          ref={pdfContainerRef}
          className="flex-1 overflow-auto p-4 bg-muted/30"
          style={{ height: '100%' }}
        >
          <div className="flex justify-center">
            <div 
              ref={canvasRef}
              className="relative bg-white shadow-2xl w-full"
              style={{
                maxWidth: '900px',
                minHeight: pdfHeight
              }}
            >
              {/* Worksheet PDF/Image Background */}
              {worksheetImageUrl ? (
                isPDF ? (
                  <iframe
                    src={`${worksheetImageUrl}#toolbar=0&navpanes=0&view=FitH`}
                    className="w-full"
                    style={{
                      border: 'none',
                      height: pdfHeight,
                      display: 'block',
                      pointerEvents: 'none'
                    }}
                  />
                ) : (
                  <img
                    src={worksheetImageUrl}
                    alt="Worksheet"
                    className="w-full h-auto"
                    style={{ maxWidth: '100%' }}
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                  <p>Worksheet will appear here after grading...</p>
                </div>
              )}

              {/* Annotations Overlay */}
              {console.log(`🎨 Rendering ${annotations.length} annotations on PDF`)}
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className={`absolute cursor-move transition-shadow ${
                    selectedAnnotation === annotation.id
                      ? "ring-2 ring-primary shadow-lg"
                      : "hover:shadow-md"
                  }`}
                  style={{
                    left: annotation.position.x,
                    top: annotation.position.y,
                    width: annotation.size.width,
                    minHeight: annotation.size.height,
                    backgroundColor:
                      annotation.color === "red"
                        ? "#fee2e2"
                        : annotation.color === "green"
                        ? "#dcfce7"
                        : annotation.color === "blue"
                        ? "#dbeafe"
                        : "#fef3c7",
                    border: `2px solid ${
                      annotation.color === "red"
                        ? "#ef4444"
                        : annotation.color === "green"
                        ? "#22c55e"
                        : annotation.color === "blue"
                        ? "#3b82f6"
                        : "#f59e0b"
                    }`,
                    borderRadius: "8px",
                    padding: "8px",
                    zIndex: selectedAnnotation === annotation.id ? 50 : 10,
                  }}
                  onClick={() => setSelectedAnnotation(annotation.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge
                      variant="secondary"
                      className="text-xs shrink-0"
                    >
                      {annotation.type === "score" && "Score"}
                      {annotation.type === "feedback" && "Feedback"}
                      {annotation.type === "checkmark" && "✓ Strength"}
                      {annotation.type === "error" && "✗ Weakness"}
                    </Badge>
                    <div className="flex gap-1">
                      {annotation.fullText && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMinimize(annotation.id)
                          }}
                        >
                          {annotation.isMinimized ? (
                            <Plus className="h-3 w-3" />
                          ) : (
                            <Minimize2 className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteAnnotation(annotation.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {annotation.isMinimized && annotation.fullText
                      ? annotation.fullText
                      : annotation.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Grading Summary */}
      <div className="w-80 border-l border-border bg-card overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Student Details */}
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-4">Student Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Student Name"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Input
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="Registration Number"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                {classSection && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{classSection}</Badge>
                  </div>
                )}
                {subject && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{subject}</Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Overall Score */}
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-4">Overall Score</h3>
              <div className="flex items-end gap-4 mb-2">
                <div>
                  <div className="text-3xl font-bold">
                    {earnedPoints}/{totalPoints}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Points</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{percentage}%</div>
                  <div className="text-xs text-muted-foreground">Percentage</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Grading Summary */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Grading Summary</h3>
            <Textarea
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              className="min-h-32 text-sm"
              placeholder="AI-generated overall feedback..."
            />
          </div>

          {/* Question Breakdown */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Question Breakdown</h3>
            <div className="space-y-4">
              {questions.map((question) => (
                <Card key={question.id}>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Question {question.number}</span>
                        <Badge variant="secondary" className="text-xs">
                          {question.earnedPoints === question.points ? "Full Credit" : "Partial Credit"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.5"
                          value={question.earnedPoints}
                          onChange={(e) => updateQuestionPoints(question.id, Number(e.target.value))}
                          className="w-16 h-8 text-center text-sm"
                          min={0}
                          max={question.points}
                        />
                        <span className="text-sm text-muted-foreground">/ {question.points} pts</span>
                      </div>
                    </div>
                    <Textarea
                      value={question.feedback}
                      onChange={(e) => updateQuestionFeedback(question.id, e.target.value)}
                      className="min-h-20 text-sm"
                      placeholder="Feedback for this question..."
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

