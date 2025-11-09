"use client"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { GradingCanvasIntegrated } from "@/components/grading-canvas-integrated"
import { Suspense } from "react"

export default function IntegratedGradingCanvasPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          <Suspense fallback={<div>Loading...</div>}>
            <GradingCanvasIntegrated />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

