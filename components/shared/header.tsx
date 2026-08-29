"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { MobileNav } from "@/components/shared/sidebar"
import { ThemeToggle } from "@/components/shared/theme-toggle"

export function Header() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-md md:px-6">
      {/* Left: Mobile Drawer Trigger + shadcn Breadcrumb */}
      <div className="flex items-center gap-3">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8 md:hidden"
              />
            }
          >
            <Menu className="size-4" />
            <span className="sr-only">Open navigation</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b px-4 py-3.5">
              <SheetTitle className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                <TrendingUp className="size-4 text-foreground" />
                IPO Tracker
              </SheetTitle>
            </SheetHeader>
            <MobileNav onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink render={<Link href="/dashboard" />}>
                App
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

      {/* Right: Theme Toggle */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  )
}
