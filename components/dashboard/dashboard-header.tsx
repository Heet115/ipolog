"use client"

import Link from "next/link"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getGreeting } from "@/lib/utils/greeting"

interface DashboardHeaderProps {
  userName: string
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {getGreeting()}, {userName}
          </h1>
          <Badge
            variant="outline"
            className="gap-1.5 rounded-none border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-foreground"
          >
            <span className="size-1.5 animate-pulse rounded-none bg-primary" />
            Live Portfolio
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          • Real-time capital allocation, active ASBA mandates & returns
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/ipos?import=true" />}
          className="shadow-sm"
        >
          <Download data-icon="inline-start" />
          Import IPO
        </Button>
      </div>
    </div>
  )
}
