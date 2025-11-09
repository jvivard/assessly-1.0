"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, User, Calendar, Award } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"

type Grade = {
  id: number
  student_name: string
  registration_number: string
  score: number
  max_score: number
  percentage: number
  graded_at: string
  job_id: string
  feedback: string
}

export default function ClassDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const section = decodeURIComponent(params.section as string)
  const subject = decodeURIComponent(params.subject as string)
  
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGrades()
  }, [section, subject])

  const loadGrades = async () => {
    try {
      const data = await apiClient.getClassGrades(section, subject)
      setGrades(data.grades)
    } catch (error) {
      console.error("Failed to load grades:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const averageScore = grades.length > 0
    ? Math.round(grades.reduce((acc, g) => acc + g.percentage, 0) / grades.length)
    : 0

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <Link href="/classes">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Classes
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{subject}</h1>
          <Badge variant="default">{section}</Badge>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span>{grades.length} students</span>
          <span>Average: {averageScore}%</span>
        </div>
      </div>

      {/* Grades List */}
      <div className="space-y-4">
        {grades.map((grade) => (
          <Card key={grade.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-3">
                  {/* Student Info */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {grade.student_name || `Student ${grade.registration_number}`}
                      </span>
                    </div>
                    {grade.registration_number && (
                      <Badge variant="outline">Reg. {grade.registration_number}</Badge>
                    )}
                  </div>

                  {/* Score and Date */}
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span>
                        {grade.score}/{grade.max_score} points
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(grade.graded_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Score Badge */}
                <div className="flex flex-col items-end gap-2">
                  <div className="text-3xl font-bold">{grade.percentage}%</div>
                  <Link href={`/grade-canvas/editor?jobId=${grade.job_id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {grades.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No grades found for this class.</p>
        </div>
      )}
    </div>
  )
}

