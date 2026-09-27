"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/shared/theme-toggle"

export function Header() {
  const pathname = usePathname()

  const isIpoDetail = pathname.startsWith("/ipos/") && pathname !== "/ipos"

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard"
    if (isIpoDetail) return "IPO Details"
    if (pathname === "/ipos") return "My IPOs"
    if (pathname === "/accounts") return "Application Accounts"
    if (pathname === "/bank-accounts") return "Bank Accounts"
    if (pathname === "/settings") return "Settings"
    return "Overview"
  }

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height,3.5rem) shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur-md transition-[width,height] ease-linear sm:px-6">
      {/* Left: Sidebar Trigger, Separator & Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="mr-1 h-4 bg-border/80" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink
                className="font-medium text-muted-foreground transition-colors hover:text-foreground"
                render={<Link href="/dashboard" />}
              >
                IPOLOG
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator className="hidden sm:inline-flex" />

            {isIpoDetail ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="font-medium text-muted-foreground transition-colors hover:text-foreground"
                    render={<Link href="/ipos" />}
                  >
                    My IPOs
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground">
                    {getPageTitle()}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground">
                  {getPageTitle()}
                </BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right Controls: Quick Add IPO & Theme Toggle */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="shadow-xs font-semibold"
          aria-label="Add IPO"
          nativeButton={false}
          render={<Link href="/ipos" />}
        >
          <Plus data-icon="inline-start" />
          <span className="hidden sm:inline">Add IPO</span>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
