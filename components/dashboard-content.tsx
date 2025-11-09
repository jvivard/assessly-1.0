"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Plus, Clock, CheckCircle, BookOpen, Zap } from "lucide-react"

const gradingData = [
  { name: "Mon", graded: 24, pending: 8 },
  { name: "Tue", graded: 32, pending: 5 },
  { name: "Wed", graded: 28, pending: 12 },
  { name: "Thu", graded: 35, pending: 3 },
  { name: "Fri", graded: 42, pending: 2 },
]

const performanceData = [
  { name: "A", value: 35, fill: "oklch(0.52 0.15 200)" },
  { name: "B", value: 42, fill: "oklch(0.55 0.18 180)" },
  { name: "C", value: 18, fill: "oklch(0.65 0.12 150)" },
  { name: "D", value: 5, fill: "oklch(0.92 0 0)" },
]

const recentAssessments = [
  { id: 1, name: "Algebra Quiz", type: "quiz", class: "Math 101", submitted: 28, graded: 24, dueDate: "Today" },
  {
    id: 2,
    name: "Essay: Climate Change",
    type: "assignment",
    class: "English 201",
    submitted: 32,
    graded: 18,
    dueDate: "Tomorrow",
  },
  { id: 3, name: "Lab Report", type: "assignment", class: "Biology 150", submitted: 25, graded: 25, dueDate: "2 days" },
  { id: 4, name: "Midterm Exam", type: "exam", class: "History 301", submitted: 20, graded: 12, dueDate: "3 days" },
  {
    id: 5,
    name: "Class Discussion",
    type: "activity",
    class: "Literature 250",
    submitted: 35,
    graded: 35,
    dueDate: "Today",
  },
]

const assessmentTypeConfig = {
  assignment: { label: "Assignment", color: "bg-blue-100 text-blue-700" },
  quiz: { label: "Quiz", color: "bg-purple-100 text-purple-700" },
  exam: { label: "Exam", color: "bg-red-100 text-red-700" },
  activity: { label: "Class Activity", color: "bg-green-100 text-green-700" },
}

export function DashboardContent() {
  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back! Here's your grading overview.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            New Assessment
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={CheckCircle}
            label="Graded This Week"
            value="161"
            subtext="↑ 12% from last week"
            color="text-primary"
          />
          <StatCard icon={Clock} label="Pending Review" value="30" subtext="Average time: 8 min" color="text-accent" />
          <StatCard icon={Zap} label="Time Saved" value="18.5h" subtext="vs manual grading" color="text-secondary" />
          <StatCard icon={BookOpen} label="Avg Grade" value="B+" subtext="Class average" color="text-primary" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Grading Trend */}
          <Card className="lg:col-span-2 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Grading Activity</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="graded" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="pending" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Grade Distribution */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Grade Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent Assessments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Recent Assessments</h2>
            <Button variant="outline">View All</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Assessment</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Class</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground">Submitted</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground">Graded</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Due</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.map((assessment) => (
                  <tr key={assessment.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4 text-foreground font-medium">{assessment.name}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${assessmentTypeConfig[assessment.type as keyof typeof assessmentTypeConfig].color}`}
                      >
                        {assessmentTypeConfig[assessment.type as keyof typeof assessmentTypeConfig].label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">{assessment.class}</td>
                    <td className="py-4 px-4 text-center text-foreground">{assessment.submitted}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-primary font-medium">
                        {assessment.graded}
                        <CheckCircle className="w-4 h-4" />
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">{assessment.dueDate}</td>
                    <td className="py-4 px-4 text-right">
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                        Grade
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  )
}

function StatCard({ icon: Icon, label, value, subtext, color }: any) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          <p className="text-xs text-muted-foreground mt-2">{subtext}</p>
        </div>
        <div className={`${color} opacity-80`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  )
}
