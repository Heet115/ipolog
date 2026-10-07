"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/firebase/auth-context"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/shared/app-sidebar"
import { Header } from "@/components/shared/header"
import { AutoRefreshProvider } from "@/components/shared/auto-refresh-provider"
import { PageTitleProvider } from "@/components/shared/page-title-context"
import { Spinner } from "@/components/ui/spinner"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
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
      <PageTitleProvider>
        <SidebarProvider
          defaultOpen={true}
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 64)",
              "--header-height": "calc(var(--spacing) * 14)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          <SidebarInset
            id="main-content"
            tabIndex={-1}
            className="outline-none"
          >
            <Header />
            <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:gap-6 lg:p-8">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </PageTitleProvider>
    </AutoRefreshProvider>
  )
}
