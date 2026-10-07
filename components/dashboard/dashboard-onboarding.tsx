"use client"

import Link from "next/link"
import { Sparkles, Users, Landmark, TrendingUp, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function DashboardOnboarding() {
  return (
    <div className="flex flex-col gap-8 py-4">
      {/* Onboarding Welcome Hero */}
      <div className="relative overflow-hidden rounded-none border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-sm sm:p-10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-none border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Welcome to IPOLog
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Master Your Multi-Account IPO Portfolio
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Track multi-account applications, automate ASBA bank capital limits,
            monitor allotment outcomes, and calculate profit-sharing splits in one
            unified command center.
          </p>
        </div>
      </div>

      {/* 3 Step Setup Guide */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="flex flex-col justify-between rounded-none border border-border/70 p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex flex-col gap-4">
            <div className="flex size-12 items-center justify-center rounded-none bg-primary/10 text-primary">
              <Users className="size-6" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Step 1
              </span>
              <h3 className="mt-1 text-lg font-bold text-foreground">
                Add Application Accounts
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Configure personal PANs, family accounts, HUFs, or investor
                client profiles with custom profit-sharing percentages.
              </p>
            </div>
          </div>
          <Button
            className="mt-6 w-full"
            nativeButton={false}
            render={<Link href="/accounts" />}
          >
            <Plus data-icon="inline-start" />
            Set Up Accounts
          </Button>
        </Card>

        <Card className="flex flex-col justify-between rounded-none border border-border/70 p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex flex-col gap-4">
            <div className="flex size-12 items-center justify-center rounded-none bg-primary/10 text-primary">
              <Landmark className="size-6" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Step 2
              </span>
              <h3 className="mt-1 text-lg font-bold text-foreground">
                Add ASBA Bank Accounts
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Register your bank accounts and specify ASBA capital limits to
                prevent blocked-fund overdrafts and monitor UPI mandate caps.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-6 w-full"
            nativeButton={false}
            render={<Link href="/bank-accounts" />}
          >
            <Landmark data-icon="inline-start" />
            Add Bank Accounts
          </Button>
        </Card>

        <Card className="flex flex-col justify-between rounded-none border border-border/70 p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex flex-col gap-4">
            <div className="flex size-12 items-center justify-center rounded-none bg-primary/10 text-primary">
              <TrendingUp className="size-6" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Step 3
              </span>
              <h3 className="mt-1 text-lg font-bold text-foreground">
                Browse & Track IPOs
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Add upcoming Mainboard or SME IPOs, import live schedules, and
                apply across all your accounts simultaneously with one click.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-6 w-full"
            nativeButton={false}
            render={<Link href="/ipos" />}
          >
            <TrendingUp data-icon="inline-start" />
            Browse IPOs
          </Button>
        </Card>
      </div>
    </div>
  )
}
