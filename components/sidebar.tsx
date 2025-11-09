import { BookOpen, BarChart3, Users, Settings, LogOut, PenTool } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function Sidebar() {
  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-sidebar-foreground">Assessly</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        <NavItem icon={BookOpen} label="Dashboard" href="/" />
        <NavItem icon={PenTool} label="GradeCanvas" href="/grade-canvas" />
        <NavItem icon={BarChart3} label="Analytics" href="/analytics" />
        <NavItem icon={Users} label="Classes" href="/classes" />
        <NavItem icon={Settings} label="Settings" href="/settings" />
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}

function NavItem({ icon: Icon, label, href }: { icon: any; label: string; href: string }) {
  return (
    <Link href={href}>
      <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent/20">
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
      </button>
    </Link>
  )
}
