"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Save } from "lucide-react"

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
}

export function GradingEditorContent() {
  const [currentWorksheet, setCurrentWorksheet] = useState(0)
  const [worksheets] = useState<Worksheet[]>([
    { id: 1, name: "Worksheet 1", status: "in-progress" },
    { id: 2, name: "Worksheet 2", status: "graded" },
    { id: 3, name: "Worksheet 3", status: "pending" },
    { id: 4, name: "Worksheet 4", status: "pending" },
    { id: 5, name: "Worksheet 5", status: "pending" },
    { id: 6, name: "Worksheet 6", status: "pending" },
  ])

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "2a",
      number: "2a",
      points: 2,
      earnedPoints: 2,
      feedback: "Good! Integral setup is correct.",
    },
    {
      id: "2b",
      number: "2b",
      points: 2,
      earnedPoints: 1,
      feedback: "Integral correct, final value not rounded to three decimals.",
    },
  ])

  const [overallFeedback, setOverallFeedback] = useState(
    "It sounds like you did a great job setting up the integral correctly, which is fantastic! However, the issue comes down to rounding your final answer to three decimal places. This means looking at the digits after the decimal point and making sure there are only three, rounding up or down as needed. It's kind of like making sure you have the perfect number of beads on a bracelet—just the right amount!",
  )

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const earnedPoints = questions.reduce((sum, q) => sum + q.earnedPoints, 0)
  const percentage = Math.round((earnedPoints / totalPoints) * 100)

  const updateQuestionFeedback = (questionId: string, feedback: string) => {
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, feedback } : q)))
  }

  const updateQuestionPoints = (questionId: string, points: number) => {
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, earnedPoints: points } : q)))
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
      </div>

      {/* Center - PDF Viewer with Annotations */}
      <div className="flex-1 flex flex-col bg-muted/30">
        {/* PDF Viewer Header */}
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
            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save All
            </Button>
            <Button size="sm">Complete</Button>
          </div>
        </div>

        {/* PDF Display Area */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          <div className="bg-card rounded-lg shadow-lg p-8 max-w-3xl w-full">
            {/* Simulated PDF with annotations */}
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Sample 2A</h2>
                <p className="text-sm text-muted-foreground">AP Calculus BC - Question 2</p>
              </div>

              {/* Question 2a */}
              <div className="border border-border rounded-lg p-4 bg-background">
                <p className="text-sm font-medium mb-2">Answer QUESTION 2 parts (a) and (b) on this page.</p>
                <div className="my-4 text-center">
                  <p className="font-mono">{"x'(2) = g²(2) · 2⁻² = 12"}</p>
                  <p className="font-mono">{"y'(2) = -2 + log(π²(2)) + 2(2) = 2.7220 ≈ 2.7225"}</p>
                  <div className="mt-2 text-red-600 font-handwriting text-lg">
                    <p>2/2 Good</p>
                    <p className="italic">ugh!</p>
                  </div>
                </div>
              </div>

              {/* Question 2b */}
              <div className="border border-border rounded-lg p-4 bg-background">
                <p className="text-sm font-medium mb-2">Response for question (2b)</p>
                <div className="my-4 text-center">
                  <p className="font-mono">{"∫₀² √(g²(t))² dt = (15,10)T cm."}</p>
                  <div className="mt-2 text-red-600 font-handwriting text-lg">
                    <p>1/2 integral</p>
                    <p>correct, final</p>
                    <p>value not</p>
                    <p>rounded to</p>
                    <p>three</p>
                    <p className="italic">decimals.</p>
                  </div>
                </div>
              </div>

              {/* Page indicator */}
              <div className="flex justify-center gap-2 mt-6">
                {[1, 2].map((page) => (
                  <div
                    key={page}
                    className={`w-2 h-2 rounded-full ${page === 1 ? "bg-primary" : "bg-muted-foreground/30"}`}
                  />
                ))}
              </div>
            </div>
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
                        <Badge variant="secondary" className="text-xs">
                          Full Credit
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
