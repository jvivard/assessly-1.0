"use client"

import { useState, useRef, useEffect } from "react"
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
  X,
  Plus,
  Move,
  Trash2,
  Check,
  Download,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

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
  fullText?: string  // Store full text when minimized
}

type Question = {
  id: string
  number: string
  points: number
  earnedPoints: number
  feedback: string
  position?: { x: number; y: number }
}

export function GradingCanvasIntegrated() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId')
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [gradingStatus, setGradingStatus] = useState<string>("processing")
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState("Starting grading...")
  const [results, setResults] = useState<any>(null)
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [overallFeedback, setOverallFeedback] = useState("")
  const [worksheetImageUrl, setWorksheetImageUrl] = useState<string | null>(null)
  const [questionImageUrl, setQuestionImageUrl] = useState<string | null>(null)
  const [isPDF, setIsPDF] = useState(false)
  const [pdfScrollY, setPdfScrollY] = useState(0)
  const [totalPages, setTotalPages] = useState(3)  // Default to 3 pages, will update from backend
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  
  // Calculate PDF height dynamically based on number of pages
  // Each page is approximately 1100px tall
  const pdfHeight = isPDF ? totalPages * 1100 : 'auto'

  // Poll for grading results and auto-generate annotations
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
        
        if (result.status === 'completed' && result.results) {
          setResults(result.results)
          setLoading(false)
          
          // Set total pages for dynamic PDF height
          if (result.results.total_pages) {
            setTotalPages(result.results.total_pages)
            console.log(`📄 PDF has ${result.results.total_pages} pages`)
          }
          
          // Set worksheet image URL from backend response
          if (result.worksheet_image_url) {
            setWorksheetImageUrl(result.worksheet_image_url)
            // Check if it's a PDF
            setIsPDF(result.worksheet_image_url.toLowerCase().endsWith('.pdf'))
          }
          if (result.question_image_url) {
            setQuestionImageUrl(result.question_image_url)
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
            setAnnotations(allAnnotations)
            
            // Set overall feedback from all questions
            const overallText = result.results.questions
              .map((q: any) => `Q${q.question_number}: ${q.feedback}`)
              .join('\n\n')
            setOverallFeedback(overallText)
          } else {
            // OLD: Single question format (backward compatibility)
            const question: Question = {
              id: "1",
              number: "1",
              points: result.results.max_points || result.results.total_max_points || 10,
              earnedPoints: result.results.score || result.results.total_score || 0,
              feedback: result.results.feedback || "No feedback provided",
              position: { x: 150, y: 250 }
            }
            setQuestions([question])
            
            // Auto-generate annotations from AI feedback
            const newAnnotations = generateAnnotationsFromResults(result.results, question)
            setAnnotations(newAnnotations)
            
            // Update overall feedback (only for single question)
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
            description: `Annotations generated automatically`
          })
        } else if (result.status === 'failed') {
          setLoading(false)
          clearInterval(intervalId)
          
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

    // Polling
    intervalId = setInterval(fetchResults, 2000)
    
    // Try WebSocket
    try {
      wsConnection = apiClient.createGradingWebSocket(
        jobId,
        (data) => {
          setGradingStatus(data.status)
          setProgress(data.progress)
          setMessage(data.message || "Processing...")
          
          if (data.status === 'completed' && data.results) {
            setResults(data.results)
            setLoading(false)
            
            // Set total pages for dynamic PDF height
            if (data.results.total_pages) {
              setTotalPages(data.results.total_pages)
              console.log(`📄 PDF has ${data.results.total_pages} pages`)
            }
            
            // Set worksheet image URL from WebSocket data
            if (data.worksheet_image_url) {
              setWorksheetImageUrl(data.worksheet_image_url)
              // Check if it's a PDF
              setIsPDF(data.worksheet_image_url.toLowerCase().endsWith('.pdf'))
            }
            if (data.question_image_url) {
              setQuestionImageUrl(data.question_image_url)
            }
            
            // Check for multi-question results
            if (data.results.questions && Array.isArray(data.results.questions)) {
              // NEW: Multi-question results
              const multiQuestions: Question[] = data.results.questions.map((q: any) => ({
                id: `${q.question_number}`,
                number: `${q.question_number}`,
                points: q.max_points,
                earnedPoints: q.score,
                feedback: q.feedback,
                position: q.position || { x: 150, y: 250 }
              }))
              setQuestions(multiQuestions)
              
              const allAnnotations: Annotation[] = []
              data.results.questions.forEach((q: any) => {
                const question = multiQuestions.find(mq => mq.id === `${q.question_number}`)
                if (question) {
                  const questionAnnotations = generateAnnotationsFromResults(q, question)
                  allAnnotations.push(...questionAnnotations)
                }
              })
              setAnnotations(allAnnotations)
              
              const overallText = data.results.questions
                .map((q: any) => `Q${q.question_number}: ${q.feedback}`)
                .join('\n\n')
              setOverallFeedback(overallText)
            } else {
              // OLD: Single question (backward compatibility)
              const question: Question = {
                id: "1",
                number: "1",
                points: data.results.max_points || data.results.total_max_points || 10,
                earnedPoints: data.results.score || data.results.total_score || 0,
                feedback: data.results.feedback || "No feedback",
                position: { x: 150, y: 250 }
              }
              setQuestions([question])
              
              const newAnnotations = generateAnnotationsFromResults(data.results, question)
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
          console.log("WebSocket unavailable, using polling")
        }
      )
    } catch (error) {
      console.log("WebSocket not supported, using polling only")
    }

    fetchResults()

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (wsConnection) wsConnection.close()
    }
  }, [jobId, toast])

  // Truncate text to 1-2 sentences
  const truncateToSentences = (text: string, maxSentences: number = 2): { short: string; full: string } => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    const shortText = sentences.slice(0, maxSentences).join(' ').trim()
    return {
      short: shortText,
      full: text
    }
  }

  // Generate annotations from AI results with smart positioning
  const generateAnnotationsFromResults = (results: any, question: Question): Annotation[] => {
    const annotations: Annotation[] = []
    
    // Use question position from backend, or default
    const baseY = question.position?.y || 250
    
    // Score annotation (top-left)
    annotations.push({
      id: `score-q${question.id}-${Date.now()}`,  // Include question ID for uniqueness
      questionId: question.id,
      text: `${results.score}/${results.max_points}`,
      position: { x: 480, y: baseY + 145 },  // Relative to question position
      size: { width: 80, height: 40 },
      type: "score",
      color: results.score === results.max_points ? "green" : "blue",
      isMinimized: false
    })
    
    // Main feedback annotation - SHORT (1-2 sentences)
    const feedbackText = truncateToSentences(results.feedback, 2)
    annotations.push({
      id: `feedback-q${question.id}-${Date.now()}`,  // Include question ID for uniqueness
      questionId: question.id,
      text: feedbackText.short,
      fullText: feedbackText.full,
      position: { x: 825, y: baseY + 195 },  // Relative to question position
      size: { width: 240, height: 100 },
      type: "feedback",
      color: "red",
      isMinimized: false
    })
    
    // Strengths annotations (green checkmarks) - SHORT
    if (results.strengths && results.strengths.length > 0) {
      results.strengths.forEach((strength: string, index: number) => {
        const strengthText = truncateToSentences(strength, 1)
        annotations.push({
          id: `strength-q${question.id}-${index}`,  // Include question ID for uniqueness
          questionId: question.id,
          text: strengthText.short,
          fullText: strengthText.full,
          position: { x: 645, y: baseY - 10 + (index * 90) },  // Relative to question position
          size: { width: 180, height: 70 },
          type: "checkmark",
          color: "green",
          isMinimized: false
        })
      })
    }
    
    // Weaknesses annotations (red X marks) - SHORT
    if (results.weaknesses && results.weaknesses.length > 0) {
      results.weaknesses.forEach((weakness: string, index: number) => {
        const weaknessText = truncateToSentences(weakness, 1)
        annotations.push({
          id: `weakness-q${question.id}-${index}`,  // Include question ID for uniqueness
          questionId: question.id,
          text: weaknessText.short,
          fullText: weaknessText.full,
          position: { x: 1065, y: baseY + 20 + (index * 90) },  // Relative to question position
          size: { width: 180, height: 70 },
          type: "error",
          color: "red",
          isMinimized: false
        })
      })
    }
    
    return annotations
  }

  // Calculate totals - support both multi-question and single question
  const totalPoints = results?.total_max_points || questions.reduce((sum, q) => sum + q.points, 0)
  const earnedPoints = results?.total_score || questions.reduce((sum, q) => sum + q.earnedPoints, 0)
  const percentage = results?.percentage || (totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0)

  const updateAnnotationText = (annotationId: string, text: string) => {
    setAnnotations(annotations.map((ann) => 
      ann.id === annotationId ? { ...ann, text } : ann
    ))
  }

  const updateAnnotationPosition = (annotationId: string, x: number, y: number) => {
    setAnnotations(annotations.map((ann) => 
      ann.id === annotationId ? { ...ann, position: { x, y } } : ann
    ))
  }

  const deleteAnnotation = (annotationId: string) => {
    setAnnotations(annotations.filter((ann) => ann.id !== annotationId))
    setSelectedAnnotation(null)
  }

  const addAnnotation = (questionId: string) => {
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      questionId,
      text: "New comment...",
      position: { x: 300, y: 300 },
      size: { width: 150, height: 100 },
      type: "feedback",
      color: "red",
      isEditing: true
    }
    setAnnotations([...annotations, newAnnotation])
    setSelectedAnnotation(newAnnotation.id)
  }

  const handleDragStart = (e: React.MouseEvent, annotationId: string) => {
    const annotation = annotations.find(ann => ann.id === annotationId)
    if (!annotation) return

    setIsDragging(true)
    setSelectedAnnotation(annotationId)
    setDragStart({
      x: e.clientX - annotation.position.x,
      y: e.clientY - annotation.position.y
    })
  }

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedAnnotation) return

    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    
    updateAnnotationPosition(selectedAnnotation, newX, newY)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const toggleEditMode = (annotationId: string) => {
    setAnnotations(annotations.map((ann) => 
      ann.id === annotationId ? { ...ann, isEditing: !ann.isEditing } : ann
    ))
  }

  const toggleMinimize = (annotationId: string) => {
    setAnnotations(annotations.map((ann) => {
      if (ann.id === annotationId) {
        const isMinimized = !ann.isMinimized
        // If minimizing and has full text, show only first sentence
        if (isMinimized && ann.fullText) {
          const firstSentence = ann.fullText.match(/[^.!?]+[.!?]+/)?.[0] || ann.text
          return { 
            ...ann, 
            isMinimized,
            text: firstSentence.length > 50 ? firstSentence.slice(0, 50) + '...' : firstSentence
          }
        }
        // If expanding, restore full text
        if (!isMinimized && ann.fullText) {
          return { ...ann, isMinimized, text: ann.fullText }
        }
        return { ...ann, isMinimized }
      }
      return ann
    }))
  }

  const updateQuestionFeedback = (questionId: string, feedback: string) => {
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, feedback } : q)))
  }

  const updateQuestionPoints = (questionId: string, points: number) => {
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, earnedPoints: points } : q)))
  }

  // Save annotations
  const saveAnnotations = async () => {
    if (!jobId) {
      toast({
        title: "No job ID",
        description: "Cannot save annotations without a job ID",
        variant: "destructive"
      })
      return
    }

    try {
      await apiClient.saveAnnotations(jobId, annotations)
      toast({
        title: "Annotations saved!",
        description: `Saved ${annotations.length} annotations successfully`
      })
    } catch (error) {
      console.error("Failed to save annotations:", error)
      toast({
        title: "Save failed",
        description: "Failed to save annotations. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Export graded worksheet
  const exportGradedWorksheet = () => {
    toast({
      title: "Export feature",
      description: "This would export the annotated worksheet as PDF"
    })
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
      {/* Left Sidebar */}
      <div className="w-64 border-r border-border bg-card p-4 overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Grading Session</h3>
          <Badge variant="outline" className="text-xs">
            {results ? "Completed" : "In Progress"}
          </Badge>
        </div>

        {/* Annotation Tools */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3">Annotation Tools</h3>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => addAnnotation(questions[0]?.id || "1")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Comment
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => {
                const checkmark: Annotation = {
                  id: `check-${Date.now()}`,
                  questionId: questions[0]?.id || "1",
                  text: "✓",
                  position: { x: 200, y: 200 },
                  size: { width: 30, height: 30 },
                  type: "checkmark",
                  color: "green"
                }
                setAnnotations([...annotations, checkmark])
              }}
            >
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Checkmark
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => {
                const error: Annotation = {
                  id: `error-${Date.now()}`,
                  questionId: questions[0]?.id || "1",
                  text: "✗",
                  position: { x: 200, y: 200 },
                  size: { width: 30, height: 30 },
                  type: "error",
                  color: "red"
                }
                setAnnotations([...annotations, error])
              }}
            >
              <X className="w-4 h-4 mr-2 text-red-600" />
              X Mark
            </Button>
          </div>
        </div>

        {/* Annotations List */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3">Annotations ({annotations.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {annotations.map((ann) => (
              <div 
                key={ann.id}
                className={`p-2 rounded border text-xs cursor-pointer hover:bg-muted/50 ${
                  selectedAnnotation === ann.id ? 'bg-muted border-primary' : 'border-border'
                }`}
                onClick={() => setSelectedAnnotation(ann.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {ann.type}
                  </Badge>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteAnnotation(ann.id)
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="truncate text-muted-foreground">{ann.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col bg-muted/30">
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Graded Worksheet - AI Annotations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              >
                -
              </Button>
              <span className="text-sm">{Math.round(scale * 100)}%</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setScale(Math.min(2, scale + 0.1))}
              >
                +
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={exportGradedWorksheet}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button size="sm" onClick={saveAnnotations}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        <div 
          className="flex-1 overflow-auto p-8 flex items-start justify-center bg-gray-100"
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div 
            ref={canvasRef}
            className="relative bg-white rounded-lg shadow-2xl"
            style={{ 
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              width: '1200px',
              border: '1px solid #e5e7eb'
            }}
          >
            {/* Scrollable container for PDF/Image + Annotations */}
            <div 
              ref={pdfContainerRef}
              className="relative overflow-auto"
              style={{
                maxHeight: '800px',  // Fixed height container
                height: isPDF ? '800px' : 'auto'
              }}
              onScroll={(e) => {
                // Track scroll position for potential use
                setPdfScrollY(e.currentTarget.scrollTop)
              }}
            >
              {/* Inner content container - this is what scrolls */}
              <div className="relative" style={{ minHeight: pdfHeight }}>
                {/* Worksheet Image/PDF Background */}
                {worksheetImageUrl ? (
                  isPDF ? (
                    /* PDF Viewer using iframe - embeds in scrollable area */
                    <iframe
                      src={`${worksheetImageUrl}#toolbar=0&navpanes=0&view=FitH`}
                      className="w-full"
                      style={{
                        border: 'none',
                        height: pdfHeight,  // Dynamic height based on total pages
                        display: 'block',
                        pointerEvents: 'none'  // Annotations can be clicked
                      }}
                      onError={() => {
                        console.error('Failed to load PDF:', worksheetImageUrl)
                        toast({
                          title: "PDF load error",
                          description: "Failed to load worksheet PDF. Make sure the file is accessible.",
                          variant: "destructive"
                        })
                      }}
                      onLoad={() => {
                        console.log('PDF loaded successfully:', worksheetImageUrl)
                      }}
                    />
                  ) : (
                    /* Image display */
                    <img 
                      src={worksheetImageUrl} 
                      alt="Student Worksheet"
                      className="w-full h-auto"
                      style={{ 
                        pointerEvents: 'none',
                        maxWidth: '100%',
                        display: 'block'
                      }}
                      onError={(e) => {
                        console.error('Failed to load worksheet image:', worksheetImageUrl)
                        toast({
                          title: "Image load error",
                          description: "Failed to load worksheet image",
                          variant: "destructive"
                        })
                      }}
                      onLoad={() => {
                        console.log('Worksheet image loaded successfully')
                      }}
                    />
                  )
                ) : (
              /* Fallback if no image available */
              <div className="absolute inset-0 p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold">Graded Worksheet</h2>
                  <p className="text-sm text-muted-foreground">AI Grading Results</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {gradingStatus === 'completed' ? 'Worksheet image not available' : 'Loading worksheet...'}
                  </p>
                </div>

                {results && (
                  <div className="space-y-4 p-6 border-2 rounded bg-white">
                    <div className="mb-4">
                      <Badge className="text-lg px-4 py-2">
                        Score: {results.score}/{results.max_points}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm leading-relaxed">{results.feedback}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

                {/* Annotations Overlay - Inside scrollable area so they move with PDF */}
                {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className={`absolute cursor-move transition-shadow ${
                  selectedAnnotation === annotation.id 
                    ? 'ring-2 ring-blue-500 shadow-lg' 
                    : 'shadow'
                }`}
                style={{
                  left: `${annotation.position.x}px`,
                  top: `${annotation.position.y}px`,
                  width: `${annotation.size.width}px`,
                  minHeight: `${annotation.size.height}px`,
                  zIndex: selectedAnnotation === annotation.id ? 50 : 10,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  handleDragStart(e, annotation.id)
                }}
                onClick={() => setSelectedAnnotation(annotation.id)}
              >
                <div 
                  className={`
                    relative h-full rounded border-2 p-2
                    ${annotation.type === 'checkmark' ? 'bg-green-50 border-green-500' : ''}
                    ${annotation.type === 'error' ? 'bg-red-50 border-red-500' : ''}
                    ${annotation.type === 'feedback' ? 'bg-white border-red-500' : ''}
                    ${annotation.type === 'score' ? 'bg-blue-50 border-blue-500' : ''}
                  `}
                >
                  {/* Minimize/Expand button - always visible for feedback/error/checkmark types */}
                  {(annotation.type === 'feedback' || annotation.type === 'error' || annotation.type === 'checkmark') && annotation.fullText && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleMinimize(annotation.id)
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 shadow z-10"
                      title={annotation.isMinimized ? "Expand" : "Minimize"}
                    >
                      {annotation.isMinimized ? (
                        <Plus className="w-3 h-3 text-gray-700" />
                      ) : (
                        <Minimize2 className="w-3 h-3 text-gray-700" />
                      )}
                    </button>
                  )}

                  {selectedAnnotation === annotation.id && (
                    <div className="absolute -top-8 right-0 flex gap-1 bg-white border rounded shadow-sm p-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleEditMode(annotation.id)
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Move className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteAnnotation(annotation.id)
                        }}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {annotation.isEditing ? (
                    <Textarea
                      value={annotation.text}
                      onChange={(e) => updateAnnotationText(annotation.id, e.target.value)}
                      onBlur={() => toggleEditMode(annotation.id)}
                      autoFocus
                      className={`w-full h-full min-h-[60px] text-sm resize-none border-0 focus:ring-0 bg-transparent p-0
                        ${annotation.color === 'red' ? 'text-red-600' : ''}
                        ${annotation.color === 'blue' ? 'text-blue-600' : ''}
                        ${annotation.color === 'green' ? 'text-green-600' : ''}
                      `}
                      style={{ fontFamily: 'cursive, "Comic Sans MS"' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div 
                      className={`whitespace-pre-wrap text-sm
                        ${annotation.color === 'red' ? 'text-red-600' : ''}
                        ${annotation.color === 'blue' ? 'text-blue-600' : ''}
                        ${annotation.color === 'green' ? 'text-green-600' : ''}
                      `}
                      style={{ 
                        fontFamily: 'cursive, "Comic Sans MS"',
                        fontStyle: 'italic',
                        fontWeight: 500
                      }}
                      onDoubleClick={() => toggleEditMode(annotation.id)}
                    >
                      {annotation.text}
                    </div>
                  )}
                </div>

                {selectedAnnotation === annotation.id && (
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize" />
                )}
              </div>
                ))}
              </div>  {/* Close inner content div */}
            </div>  {/* Close scrollable container */}
          </div>  {/* Close canvas */}
        </div>  {/* Close outer container */}
      </div>  {/* Start right sidebar */}

      {/* Right Sidebar */}
      <div className="w-96 border-l border-border bg-card overflow-y-auto">
        <div className="p-6 space-y-6">
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

          <div>
            <h3 className="text-sm font-semibold mb-3">Overall Feedback</h3>
            <Textarea
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              className="min-h-32 text-sm"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Questions</h3>
            <div className="space-y-4">
              {questions.map((question) => (
                <Card key={question.id}>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Question {question.number}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={question.earnedPoints}
                          onChange={(e) => updateQuestionPoints(question.id, Number(e.target.value))}
                          className="w-16 h-8 text-center text-sm"
                          min={0}
                          max={question.points}
                        />
                        <span className="text-sm text-muted-foreground">/ {question.points}</span>
                      </div>
                    </div>
                    <Textarea
                      value={question.feedback}
                      onChange={(e) => updateQuestionFeedback(question.id, e.target.value)}
                      className="min-h-20 text-sm"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                      onClick={() => addAnnotation(question.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Canvas
                    </Button>
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

