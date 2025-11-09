"use client"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { GradingCanvasWithAnnotations } from "@/components/grading-canvas-with-annotations"

export default function AnnotationCanvasPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          <GradingCanvasWithAnnotations />
        </main>
      </div>
    </div>
  )
}

