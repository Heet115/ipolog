"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/firebase/auth-context"
import { Sidebar } from "@/components/shared/sidebar"
import { Header } from "@/components/shared/header"
import { AutoRefreshProvider } from "@/components/shared/auto-refresh-provider"
import { Spinner } from "@/components/ui/spinner"
import { useEffect } from "react"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AutoRefreshProvider>
      <div className="flex min-h-svh bg-background text-foreground">
        {/* Desktop sidebar */}
        <div className="hidden shrink-0 md:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main content area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 overflow-auto p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </AutoRefreshProvider>
  )
}
