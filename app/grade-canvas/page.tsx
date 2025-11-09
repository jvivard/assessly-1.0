"use client"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { GradeCanvasContentIntegrated as GradeCanvasContent } from "@/components/grade-canvas-content-integrated"

export default function GradeCanvasPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <GradeCanvasContent />
        </main>
      </div>
    </div>
  )
}
