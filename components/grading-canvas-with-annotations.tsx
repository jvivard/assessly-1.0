"use client"

import { useState, useRef, useEffect } from "react"
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
  Check
} from "lucide-react"

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
}

type Question = {
  id: string
  number: string
  points: number
  earnedPoints: number
  feedback: string
  position?: { x: number; y: number } // Position on the PDF
}

type Worksheet = {
  id: number
  name: string
  status: "pending" | "graded" | "in-progress"
  imageUrl?: string
}

export function GradingCanvasWithAnnotations() {
  const [currentWorksheet, setCurrentWorksheet] = useState(0)
  const [worksheets] = useState<Worksheet[]>([
    { 
      id: 1, 
      name: "Sample 2A", 
      status: "in-progress",
      imageUrl: "/placeholder.svg" // Replace with actual worksheet image
    },
  ])

  // Questions with scores
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "2a",
      number: "2a",
      points: 2,
      earnedPoints: 2,
      feedback: "Good! Integral setup is correct.",
      position: { x: 150, y: 200 }
    },
    {
      id: "2b",
      number: "2b",
      points: 2,
      earnedPoints: 1,
      feedback: "Integral correct, final value not rounded to three decimals.",
      position: { x: 150, y: 450 }
    },
  ])

  // Annotations (comment boxes on the PDF)
  const [annotations, setAnnotations] = useState<Annotation[]>([
    {
      id: "ann-1",
      questionId: "2a",
      text: "2/2 Good\njob!",
      position: { x: 400, y: 250 },
      size: { width: 120, height: 80 },
      type: "feedback",
      color: "red"
    },
    {
      id: "ann-2",
      questionId: "2b",
      text: "1/2 Integral\ncorrect, final\nvalue not\nrounded to\nthree\ndecimals.",
      position: { x: 400, y: 500 },
      size: { width: 140, height: 140 },
      type: "feedback",
      color: "red"
    },
    {
      id: "ann-3",
      questionId: "2a",
      text: "✓",
      position: { x: 350, y: 230 },
      size: { width: 30, height: 30 },
      type: "checkmark",
      color: "blue"
    },
    {
      id: "ann-4",
      questionId: "2b",
      text: "✗",
      position: { x: 750, y: 480 },
      size: { width: 30, height: 30 },
      type: "error",
      color: "red"
    }
  ])

  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [overallFeedback, setOverallFeedback] = useState(
    "It sounds like you did a great job setting up the integral correctly, which is fantastic! However, the issue comes down to rounding your final answer to three decimal places."
  )
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const earnedPoints = questions.reduce((sum, q) => sum + q.earnedPoints, 0)
  const percentage = Math.round((earnedPoints / totalPoints) * 100)

  // Update annotation text
  const updateAnnotationText = (annotationId: string, text: string) => {
    setAnnotations(annotations.map((ann) => 
      ann.id === annotationId ? { ...ann, text } : ann
    ))
  }

  // Update annotation position
  const updateAnnotationPosition = (annotationId: string, x: number, y: number) => {
    setAnnotations(annotations.map((ann) => 
      ann.id === annotationId ? { ...ann, position: { x, y } } : ann
    ))
  }

  // Delete annotation
  const deleteAnnotation = (annotationId: string) => {
    setAnnotations(annotations.filter((ann) => ann.id !== annotationId))
    setSelectedAnnotation(null)
  }

  // Add new annotation
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

  // Handle drag start
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

  // Handle drag move
  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedAnnotation) return

    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    
    updateAnnotationPosition(selectedAnnotation, newX, newY)
  }

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const updateQuestionFeedback = (questionId: string, feedback: string) => {
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, feedback } : q)))
  }

  const updateQuestionPoints = (questionId: string, points: number) => {
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, earnedPoints: points } : q)))
  }

  // Toggle edit mode for annotation
  const toggleEditMode = (annotationId: string) => {
    setAnnotations(annotations.map((ann) => 
      ann.id === annotationId ? { ...ann, isEditing: !ann.isEditing } : ann
    ))
  }

  return (
    <div className="flex h-full bg-background">
      {/* Left Sidebar - Worksheet List */}
      <div className="w-64 border-r border-border bg-card p-4 overflow-y-auto">
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
              {worksheet.status === "graded" ? (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              ) : worksheet.status === "in-progress" ? (
                <Circle className="w-4 h-4 text-primary fill-primary" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>

        {/* Annotation Tools */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3">Annotation Tools</h3>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => addAnnotation(questions[0].id)}
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
                  questionId: questions[0].id,
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
              Add Checkmark
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => {
                const error: Annotation = {
                  id: `error-${Date.now()}`,
                  questionId: questions[0].id,
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
              Add X Mark
            </Button>
          </div>
        </div>
      </div>

      {/* Center - PDF Canvas with Annotations */}
      <div className="flex-1 flex flex-col bg-muted/30">
        {/* Canvas Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm font-medium">Page 1 of 2 - {worksheets[currentWorksheet].name}</span>
            <Button variant="outline" size="sm">
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
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
            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save All
            </Button>
            <Button size="sm">Complete</Button>
          </div>
        </div>

        {/* Canvas Display Area */}
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
              width: '850px',
              minHeight: '1100px',
              border: '1px solid #e5e7eb'
            }}
          >
            {/* Worksheet Background Image/PDF */}
            <div className="absolute inset-0 p-8">
              <div className="text-center mb-6 pb-4 border-b-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">1 of 2</span>
                  <h2 className="text-2xl font-bold">Sample 2A</h2>
                  <div className="flex gap-1">
                    {Array(14).fill(0).map((_, i) => (
                      <div key={i} className="w-6 h-6 border border-gray-400 flex items-center justify-center text-xs">
                        2
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Simulated worksheet content */}
              <div className="space-y-8">
                {/* Question 2a */}
                <div className="border-2 border-gray-800 p-4 rounded">
                  <p className="text-sm font-medium mb-3">Answer QUESTION 2 parts (a) and (b) on this page.</p>
                  <div className="bg-gray-50 p-3 rounded mb-2">
                    <p className="text-xs text-gray-600 mb-2">Response for question 2(a)</p>
                  </div>
                  <div className="handwriting-sim text-lg space-y-1">
                    <p>x'(2) = g²(2) · 2⁻² = 12</p>
                    <p>y'(2) = -2 + √(2π²+20) ≈ 2.7220</p>
                    <p className="mt-2">speed: √(6²)² + (√21)² = √12² + 2.7220² = √(12.30449)</p>
                  </div>
                </div>

                {/* Question 2b */}
                <div className="border-2 border-gray-800 p-4 rounded mt-8">
                  <div className="bg-gray-50 p-3 rounded mb-2">
                    <p className="text-xs text-gray-600 mb-2">Response for question 2(b)</p>
                  </div>
                  <div className="handwriting-sim text-lg">
                    <p>∫₀² √(g²(t))² dt = (15,10)T cm.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Annotations Overlay */}
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
                {/* Annotation Box */}
                <div 
                  className={`
                    relative h-full rounded border-2 p-2
                    ${annotation.type === 'checkmark' ? 'bg-green-50 border-green-500' : ''}
                    ${annotation.type === 'error' ? 'bg-red-50 border-red-500' : ''}
                    ${annotation.type === 'feedback' ? 'bg-white border-red-500' : ''}
                    ${annotation.type === 'score' ? 'bg-blue-50 border-blue-500' : ''}
                  `}
                >
                  {/* Annotation Controls (show when selected) */}
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

                  {/* Annotation Content */}
                  {annotation.isEditing ? (
                    <Textarea
                      value={annotation.text}
                      onChange={(e) => updateAnnotationText(annotation.id, e.target.value)}
                      onBlur={() => toggleEditMode(annotation.id)}
                      autoFocus
                      className={`
                        w-full h-full min-h-[60px] text-sm resize-none
                        ${annotation.color === 'red' ? 'text-red-600' : ''}
                        ${annotation.color === 'blue' ? 'text-blue-600' : ''}
                        ${annotation.color === 'green' ? 'text-green-600' : ''}
                        border-0 focus:ring-0 bg-transparent p-0
                      `}
                      style={{ 
                        fontFamily: annotation.type === 'checkmark' || annotation.type === 'error' 
                          ? 'sans-serif' 
                          : 'cursive, "Comic Sans MS"'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div 
                      className={`
                        whitespace-pre-wrap text-sm
                        ${annotation.color === 'red' ? 'text-red-600' : ''}
                        ${annotation.color === 'blue' ? 'text-blue-600' : ''}
                        ${annotation.color === 'green' ? 'text-green-600' : ''}
                      `}
                      style={{ 
                        fontFamily: annotation.type === 'checkmark' || annotation.type === 'error' 
                          ? 'sans-serif' 
                          : 'cursive, "Comic Sans MS"',
                        fontSize: annotation.type === 'checkmark' || annotation.type === 'error' 
                          ? '24px' 
                          : '14px',
                        fontStyle: 'italic',
                        fontWeight: 500
                      }}
                      onDoubleClick={() => toggleEditMode(annotation.id)}
                    >
                      {annotation.text}
                    </div>
                  )}
                </div>

                {/* Drag Handle */}
                {selectedAnnotation === annotation.id && (
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Grading Summary */}
      <div className="w-96 border-l border-border bg-card overflow-y-auto">
        <div className="p-6 space-y-6">
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
                        <Badge variant={question.earnedPoints === question.points ? "default" : "secondary"} className="text-xs">
                          {question.earnedPoints === question.points ? "Full Credit" : "Partial Credit"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                      onClick={() => addAnnotation(question.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Annotation to Canvas
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Annotations List */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Canvas Annotations</h3>
            <div className="space-y-2">
              {annotations.map((ann) => (
                <div 
                  key={ann.id}
                  className={`p-2 rounded border text-xs cursor-pointer hover:bg-muted/50 ${
                    selectedAnnotation === ann.id ? 'bg-muted border-primary' : 'border-border'
                  }`}
                  onClick={() => setSelectedAnnotation(ann.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">
                      Q{ann.questionId}
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
      </div>
    </div>
  )
}

