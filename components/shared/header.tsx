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
    return "Overview"
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur-md transition-[width,height] ease-linear">
      {/* Left: Sidebar Trigger, Separator & Breadcrumbs */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink render={<Link href="/dashboard" />}>
                IPOLOG
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator className="hidden sm:inline-flex" />

            {isIpoDetail ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href="/ipos" />}>
                    My IPOs
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right Controls: Quick Add IPO & Theme Toggle */}
      <div className="flex items-center gap-2">
        <Button
          size="xs"
          className="h-8 gap-1 text-xs font-semibold"
          render={<Link href="/ipos" />}
        >
          <Plus data-icon="inline-start" className="size-3.5" />
          <span className="hidden sm:inline">Add IPO</span>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
