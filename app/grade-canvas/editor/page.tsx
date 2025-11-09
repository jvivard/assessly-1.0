"use client"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { GradingEditorContentLive } from "@/components/grading-editor-content-live"
import { Suspense } from "react"

export default function GradingEditorPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          <Suspense fallback={<div>Loading...</div>}>
            <GradingEditorContentLive />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
