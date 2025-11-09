"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, BookOpen, TrendingUp, ChevronRight } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"

type ClassData = {
  [section: string]: {
    [subject: string]: {
      total_students: number
      average_score: number
      total_score: number
      total_max_score: number
      grades: Array<{
        id: number
        student_name: string
        registration_number: string
        score: number
        max_score: number
        percentage: number
        graded_at: string
        job_id: string
      }>
    }
  }
}

export default function ClassesPage() {
  const [classesData, setClassesData] = useState<ClassData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      const data = await apiClient.getClasses()
      setClassesData(data)
    } catch (error) {
      console.error("Failed to load classes:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">View graded worksheets organized by class and subject</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!classesData || Object.keys(classesData).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Classes Yet</h2>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Start grading worksheets to see them organized by class and subject here.
        </p>
        <Link href="/grade-canvas">
          <Button>Start Grading</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Classes</h1>
        <p className="text-muted-foreground">View graded worksheets organized by class and subject</p>
      </div>

      {/* Classes Grid */}
      {Object.entries(classesData).map(([section, subjects]) => (
        <div key={section} className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="text-lg px-4 py-1">{section}</Badge>
            <span className="text-sm text-muted-foreground">
              {Object.values(subjects).reduce((acc, subject) => acc + subject.total_students, 0)} students
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(subjects).map(([subject, data]) => (
              <Card key={subject} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      {subject}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {data.total_students} {data.total_students === 1 ? 'student' : 'students'} graded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Average Score */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        Average Score
                      </div>
                      <div className="text-2xl font-bold">{data.average_score}%</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${data.average_score}%` }}
                      />
                    </div>

                    {/* Student List Preview */}
                    <div className="space-y-2 pt-2">
                      {data.grades.slice(0, 3).map((grade) => (
                        <div key={grade.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate flex-1">
                            {grade.student_name || `Reg. ${grade.registration_number}`}
                          </span>
                          <Badge variant="outline">{grade.percentage}%</Badge>
                        </div>
                      ))}
                      {data.grades.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{data.grades.length - 3} more...
                        </p>
                      )}
                    </div>

                    {/* View Details Button */}
                    <Link href={`/classes/${encodeURIComponent(section)}/${encodeURIComponent(subject)}`}>
                      <Button variant="outline" className="w-full mt-4">
                        View All
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

