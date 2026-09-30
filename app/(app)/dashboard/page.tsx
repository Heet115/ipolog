"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  TrendingUp,
  Lock,
  CheckCircle2,
  Users,
  Landmark,
  ArrowRight,
  Plus,
  Download,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Clock,
  Wallet,
  ArrowUpRight,
  Activity,
  CircleDollarSign,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/lib/firebase/auth-context"
import { getIpos } from "@/lib/firebase/ipos"
import {
  getApplications,
  cleanupOrphanedApplications,
} from "@/lib/firebase/applications"
import { getApplicationAccounts } from "@/lib/firebase/accounts"
import { getBankAccounts } from "@/lib/firebase/bank-accounts"
import {
  calculateDashboardMetrics,
  calculateApplicationProfit,
  checkBankAsbaLimits,
  calculateReceivablesSummary,
} from "@/lib/calculations/financials"
import { exportPortfolioSummaryCsv } from "@/lib/utils/export-csv"
import { formatCurrency, formatDate, getIpoStatus } from "@/lib/utils/ipo"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { usePageTitle } from "@/hooks/use-page-title"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
} from "@/types"

export default function DashboardPage() {
  usePageTitle("Dashboard")
  const { user } = useAuth()

  const [ipos, setIpos] = useState<Ipo[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [accounts, setAccounts] = useState<ApplicationAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)

  const [fetchError, setFetchError] = useState(false)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  // Interactive UI Tab states
  const [ipoTab, setIpoTab] = useState<"all" | "open" | "allotment">("all")
  const [appTab, setAppTab] = useState<"recent" | "sold">("recent")

  useEffect(() => {
    let ignore = false
    if (!user) return

    Promise.all([
      getIpos(user.uid, true),
      getApplications(user.uid),
      getApplicationAccounts(user.uid, true),
      getBankAccounts(user.uid, true),
    ])
      .then(([iposData, appsData, accountsData, banksData]) => {
        if (!ignore) {
          const validIpoIds = new Set(iposData.map((i) => i.id))
          const validApps = appsData.filter((a) => validIpoIds.has(a.ipoId))
          if (validApps.length !== appsData.length) {
            cleanupOrphanedApplications(
              user.uid,
              iposData.map((i) => i.id)
            ).catch(console.error)
          }
          setIpos(iposData)
          setApplications(validApps)
          setAccounts(accountsData)
          setBankAccounts(banksData)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load dashboard data:", err)
        if (!ignore) {
          setFetchError(true)
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user, fetchTrigger])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (fetchError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle className="size-6 text-destructive" />
          </EmptyMedia>
          <EmptyTitle>Failed to load portfolio data</EmptyTitle>
          <EmptyDescription>
            Something went wrong while connecting to your portfolio. Please check
            your connection and try again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            size="sm"
            onClick={() => {
              setLoading(true)
              setFetchError(false)
              setFetchTrigger((prev) => prev + 1)
            }}
          >
            <RefreshCw data-icon="inline-start" className="size-3.5" />
            Retry
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const metrics = calculateDashboardMetrics(ipos, applications, accounts)
  const ipoMap = new Map(ipos.map((i) => [i.id, i]))
  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const receivables = calculateReceivablesSummary(
    applications,
    ipoMap,
    accountMap
  )

  // Active IPOs filtering
  const activeIpos = ipos
    .filter((ipo) => !ipo.archived)
    .filter((ipo) => {
      const st = getIpoStatus(ipo).status
      return (
        st === "upcoming" ||
        st === "open" ||
        st === "allotment_pending" ||
        st === "closed"
      )
    })

  const openIpos = activeIpos.filter(
    (ipo) => getIpoStatus(ipo).status === "open"
  )
  const allotmentIpos = activeIpos.filter((ipo) => {
    const st = getIpoStatus(ipo).status
    return st === "allotment_pending" || st === "closed"
  })

  const displayedIpos =
    ipoTab === "open"
      ? openIpos
      : ipoTab === "allotment"
        ? allotmentIpos
        : activeIpos

  // Applications sorting & filtering
  const recentApps = [...applications]
    .sort((a, b) => {
      const aTime = a.applicationDate?.seconds ?? 0
      const bTime = b.applicationDate?.seconds ?? 0
      return bTime - aTime
    })
    .slice(0, 7)

  const soldApps = applications
    .filter((a) => a.status === "sold")
    .sort((a, b) => {
      const aTime = a.updatedAt?.seconds ?? a.applicationDate?.seconds ?? 0
      const bTime = b.updatedAt?.seconds ?? b.applicationDate?.seconds ?? 0
      return bTime - aTime
    })
    .slice(0, 7)

  // ASBA and bank liquidity stats
  const activeBankAccounts = bankAccounts.filter((b) => !b.archived)
  const totalAsbaLimit = activeBankAccounts.reduce(
    (sum, b) => sum + (b.asbaLimit || 0),
    0
  )
  const asbaUtilization =
    totalAsbaLimit > 0
      ? Math.min(100, Math.round((metrics.totalBlocked / totalAsbaLimit) * 100))
      : 0

  const asbaWarnings = checkBankAsbaLimits(bankAccounts, applications, ipoMap)
  const exceededWarnings = asbaWarnings.filter((w) => w.isExceeded)

  const totalDecided =
    metrics.allottedApplications +
    metrics.soldApplications +
    metrics.notAllottedApplications
  const successRate =
    totalDecided > 0
      ? ((metrics.allottedApplications + metrics.soldApplications) /
          totalDecided) *
        100
      : 0

  // Total capital in motion & visual distribution bar
  const totalInMotion =
    metrics.totalInvested + metrics.totalBlocked + metrics.totalRefundExpected
  const investedPct =
    totalInMotion > 0 ? (metrics.totalInvested / totalInMotion) * 100 : 0
  const blockedPct =
    totalInMotion > 0 ? (metrics.totalBlocked / totalInMotion) * 100 : 0
  const refundPct =
    totalInMotion > 0 ? (metrics.totalRefundExpected / totalInMotion) * 100 : 0

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }
  const userName = user?.displayName ? user.displayName.split(" ")[0] : "Investor"

  // Empty state: Guided Onboarding Experience
  if (ipos.length === 0 && accounts.length === 0 && bankAccounts.length === 0) {
    return (
      <div className="flex flex-col gap-8 py-4">
        {/* Onboarding Welcome Hero */}
        <div className="relative overflow-hidden rounded-none border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-10 shadow-sm">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-none border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              Welcome to IPOLog
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Master Your Multi-Account IPO Portfolio
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base leading-relaxed">
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
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step 1
                </span>
                <h3 className="mt-1 text-lg font-bold text-foreground">
                  Add Application Accounts
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Configure personal PANs, family accounts, HUFs, or investor client
                  profiles with custom profit-sharing percentages.
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
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step 2
                </span>
                <h3 className="mt-1 text-lg font-bold text-foreground">
                  Add ASBA Bank Accounts
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Register your bank accounts and specify ASBA capital limits to prevent
                  blocked-fund overdrafts and monitor UPI mandate caps.
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
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step 3
                </span>
                <h3 className="mt-1 text-lg font-bold text-foreground">
                  Browse & Track IPOs
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Add upcoming Mainboard or SME IPOs, import live schedules, and apply
                  across all your accounts simultaneously with one click.
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

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "allotted":
        return (
          <Badge variant="success" className="px-2 py-0.5 text-xs font-medium">
            Allotted
          </Badge>
        )
      case "not_allotted":
        return (
          <Badge
            variant="secondary"
            className="px-2 py-0.5 text-xs font-medium"
          >
            Not Allotted
          </Badge>
        )
      case "sold":
        return (
          <Badge variant="info" className="px-2 py-0.5 text-xs font-medium">
            Sold
          </Badge>
        )
      case "pending":
      default:
        return (
          <Badge variant="outline" className="px-2 py-0.5 text-xs font-medium">
            Pending
          </Badge>
        )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header with Time-Aware Greeting & Live Status */}
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
              <span className="size-1.5 rounded-none bg-primary animate-pulse" />
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
          {applications.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                exportPortfolioSummaryCsv(
                  ipos,
                  applications,
                  accounts,
                  bankAccounts
                )
                toast.add({
                  title: "Portfolio report exported to CSV",
                  type: "success",
                })
              }}
            >
              <Download data-icon="inline-start" />
              Export CSV
            </Button>
          )}
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/ipos" />}
            className="shadow-sm"
          >
            <Plus data-icon="inline-start" />
            Add IPO
          </Button>
        </div>
      </div>

      {/* 2. ASBA Limit Critical Alerts */}
      {exceededWarnings.length > 0 && (
        <div className="flex flex-col gap-3 rounded-none border border-destructive/30 bg-destructive/10 p-4 text-xs text-foreground shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 font-semibold text-destructive">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/20 text-destructive">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-destructive">
                  ASBA Capital Limit Warning
                </p>
                <p className="text-xs text-muted-foreground">
                  Blocked UPI mandates exceed available balance in{" "}
                  {exceededWarnings.length} bank account
                  {exceededWarnings.length > 1 ? "s" : ""}. Please replenish funds
                  to prevent application rejections.
                </p>
              </div>
            </div>
            <Button
              size="xs"
              variant="outline"
              nativeButton={false}
              render={<Link href="/bank-accounts" />}
              className="text-xs"
            >
              Manage Bank Accounts
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2 lg:grid-cols-3">
            {exceededWarnings.map((w) => (
              <div
                key={w.bankId}
                className="flex flex-col gap-1 rounded-none border border-destructive/20 bg-background/80 p-3 shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {w.nickname || w.bankName}{" "}
                    {w.last4 ? `(••${w.last4})` : ""}
                  </span>
                  <Badge variant="destructive" className="font-mono text-[9px]">
                    +{formatCurrency(w.exceededAmount)} Over
                  </Badge>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                  <span>
                    Blocked:{" "}
                    <strong className="text-destructive">
                      {formatCurrency(w.blockedAmount)}
                    </strong>
                  </span>
                  <span>Limit: {formatCurrency(w.asbaLimit)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Executive Financial Command Center (Hero Card) */}
      <Card className="overflow-hidden rounded-none border border-border/70 bg-card shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Portfolio Command Center
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline">
              Consolidated across {accounts.filter((a) => !a.archived).length}{" "}
              active accounts
            </span>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {metrics.totalApplications} bids filed
            </Badge>
          </div>
        </div>

        {/* 4 Metric Columns */}
        <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {/* Metric 1: Net Realized Profit (You) */}
          <div className="flex flex-col justify-between gap-3 bg-gradient-to-br from-success/5 via-transparent to-transparent p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Your Realized Profit
              </span>
              <div className="flex size-8 items-center justify-center rounded-none bg-success/10 text-success">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div>
              <p
                className={`font-mono text-3xl font-bold tracking-tight sm:text-4xl ${
                  metrics.totalYourRealizedProfit > 0
                    ? "text-success"
                    : metrics.totalYourRealizedProfit < 0
                      ? "text-destructive"
                      : "text-foreground"
                }`}
              >
                {formatCurrency(metrics.totalYourRealizedProfit)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.totalProfitShared > 0 ? (
                  <span>
                    + {formatCurrency(metrics.totalProfitShared)} shared with
                    partners
                  </span>
                ) : (
                  <span>From {metrics.soldApplications} sold applications</span>
                )}
              </p>
            </div>
          </div>

          {/* Metric 2: Currently Blocked Mandates */}
          <div className="flex flex-col justify-between gap-3 bg-gradient-to-br from-warning/5 via-transparent to-transparent p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Currently Blocked
              </span>
              <div className="flex size-8 items-center justify-center rounded-none bg-warning/10 text-warning-foreground">
                <Lock className="size-4" />
              </div>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {formatCurrency(metrics.totalBlocked)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Across {metrics.pendingApplications} pending UPI mandates
              </p>
            </div>
          </div>

          {/* Metric 3: Total Invested Capital */}
          <div className="flex flex-col justify-between gap-3 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Invested Capital
              </span>
              <div className="flex size-8 items-center justify-center rounded-none bg-primary/10 text-primary">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {formatCurrency(metrics.totalInvested)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                In {metrics.allottedApplications + metrics.soldApplications}{" "}
                allotted applications
              </p>
            </div>
          </div>

          {/* Metric 4: Allotment Win Rate */}
          <div className="flex flex-col justify-between gap-3 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Allotment Win Rate
              </span>
              <div className="flex size-8 items-center justify-center rounded-none bg-primary/10 text-primary">
                <CircleDollarSign className="size-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <p className="font-mono text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {successRate.toFixed(1)}%
                </p>
                <span className="font-mono text-xs text-muted-foreground">
                  ({metrics.allottedApplications + metrics.soldApplications}/
                  {totalDecided})
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-none bg-muted">
                <div
                  className="h-full rounded-none bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, successRate))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Capital Allocation Flow Bar */}
        {totalInMotion > 0 && (
          <div className="border-t border-border/60 bg-muted/10 p-4 sm:px-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  Current Capital in Motion
                </span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(totalInMotion)}
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-none bg-muted">
                {investedPct > 0 && (
                  <div
                    style={{ width: `${investedPct}%` }}
                    className="bg-primary transition-all"
                    title={`Invested: ${formatCurrency(metrics.totalInvested)}`}
                  />
                )}
                {blockedPct > 0 && (
                  <div
                    style={{ width: `${blockedPct}%` }}
                    className="bg-warning transition-all"
                    title={`Blocked: ${formatCurrency(metrics.totalBlocked)}`}
                  />
                )}
                {refundPct > 0 && (
                  <div
                    style={{ width: `${refundPct}%` }}
                    className="bg-muted-foreground/40 transition-all"
                    title={`Refund: ${formatCurrency(metrics.totalRefundExpected)}`}
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-none bg-primary" />
                  <span>
                    Invested:{" "}
                    <strong className="font-mono text-foreground">
                      {formatCurrency(metrics.totalInvested)}
                    </strong>{" "}
                    ({investedPct.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-none bg-warning" />
                  <span>
                    Blocked ASBA:{" "}
                    <strong className="font-mono text-foreground">
                      {formatCurrency(metrics.totalBlocked)}
                    </strong>{" "}
                    ({blockedPct.toFixed(0)}%)
                  </span>
                </div>
                {metrics.totalRefundExpected > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-none bg-muted-foreground/40" />
                    <span>
                      Expected Refunds:{" "}
                      <strong className="font-mono text-foreground">
                        {formatCurrency(metrics.totalRefundExpected)}
                      </strong>{" "}
                      ({refundPct.toFixed(0)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 4. Secondary Operational Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Receivables */}
        <Card className="rounded-none border border-border/70 shadow-xs transition-all hover:border-border hover:shadow-sm">
          <CardContent className="flex flex-col justify-between gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Pending Receivables
              </span>
              <div className="flex size-7 items-center justify-center rounded-none bg-muted text-muted-foreground">
                <Wallet className="size-3.5" />
              </div>
            </div>
            <div>
              <p
                className={`font-mono text-xl font-bold ${
                  receivables.totalPendingReceivables > 0
                    ? "text-warning-foreground"
                    : "text-foreground"
                }`}
              >
                {formatCurrency(receivables.totalPendingReceivables)}
              </p>
              <div className="mt-1 flex items-center justify-between text-xs">
                {receivables.totalPendingReceivables > 0 ? (
                  <Link
                    href="/accounts"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <span>{receivables.pendingAccountsCount} accounts to settle</span>
                    <ArrowUpRight className="size-3" />
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    All sales settled ✓
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit Shared */}
        <Card className="rounded-none border border-border/70 shadow-xs transition-all hover:border-border hover:shadow-sm">
          <CardContent className="flex flex-col justify-between gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Profit Distributed
              </span>
              <div className="flex size-7 items-center justify-center rounded-none bg-muted text-muted-foreground">
                <Users className="size-3.5" />
              </div>
            </div>
            <div>
              <p className="font-mono text-xl font-bold text-foreground">
                {formatCurrency(metrics.totalProfitShared)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                To{" "}
                {
                  accounts.filter((a) => a.type === "other" && !a.archived)
                    .length
                }{" "}
                partner accounts
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expected Refunds */}
        <Card className="rounded-none border border-border/70 shadow-xs transition-all hover:border-border hover:shadow-sm">
          <CardContent className="flex flex-col justify-between gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Refunds in Transit
              </span>
              <div className="flex size-7 items-center justify-center rounded-none bg-muted text-muted-foreground">
                <Clock className="size-3.5" />
              </div>
            </div>
            <div>
              <p className="font-mono text-xl font-bold text-foreground">
                {formatCurrency(metrics.totalRefundExpected)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                From {metrics.notAllottedApplications} unallotted applications
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total ASBA Capacity */}
        <Card className="rounded-none border border-border/70 shadow-xs transition-all hover:border-border hover:shadow-sm">
          <CardContent className="flex flex-col justify-between gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Bank ASBA Utilization
              </span>
              <div className="flex size-7 items-center justify-center rounded-none bg-muted text-muted-foreground">
                <Landmark className="size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-xl font-bold text-foreground">
                  {asbaUtilization}%
                </p>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatCurrency(metrics.totalBlocked)} /{" "}
                  {formatCurrency(totalAsbaLimit)}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-none bg-muted">
                <div
                  className={`h-full rounded-none transition-all ${
                    asbaUtilization > 100
                      ? "bg-destructive"
                      : asbaUtilization >= 80
                        ? "bg-warning"
                        : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, asbaUtilization)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Main Power Layout (Left 2 Spans, Right 1 Span) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (Span 2): IPO Pipeline + Application Ledger */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* Active IPO Pipeline Card with Filters */}
          <Card className="rounded-none border border-border/70 shadow-xs">
            <CardHeader className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Active IPO Pipeline
                </CardTitle>
                <CardDescription className="text-xs">
                  Schedules, price bands, and multi-account application coverage
                </CardDescription>
              </div>

              {/* Filter Tabs & Browse Action */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-none border border-border/60 bg-muted/40 p-0.5 text-xs">
                  <button
                    onClick={() => setIpoTab("all")}
                    className={`rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                      ipoTab === "all"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({activeIpos.length})
                  </button>
                  <button
                    onClick={() => setIpoTab("open")}
                    className={`rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                      ipoTab === "open"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Open ({openIpos.length})
                  </button>
                  <button
                    onClick={() => setIpoTab("allotment")}
                    className={`rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                      ipoTab === "allotment"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Allotment ({allotmentIpos.length})
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="xs"
                  className="text-xs"
                  nativeButton={false}
                  render={<Link href="/ipos" />}
                >
                  All IPOs
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {displayedIpos.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No IPOs matching this filter right now. Click &quot;Add IPO&quot; to
                  track upcoming issues.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[550px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">IPO & Category</TableHead>
                        <TableHead className="text-xs">Timeline Status</TableHead>
                        <TableHead className="text-right text-xs">
                          Price & Min Bid
                        </TableHead>
                        <TableHead className="text-center text-xs">
                          Account Coverage
                        </TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedIpos.map((ipo) => {
                        const derived = getIpoStatus(ipo)
                        const ipoApps = applications.filter(
                          (a) => a.ipoId === ipo.id
                        )
                        const activeAccountsCount = accounts.filter(
                          (a) => !a.archived
                        ).length
                        const minInvestment = ipo.issuePrice * ipo.lotSize

                        return (
                          <TableRow key={ipo.id} className="hover:bg-muted/30">
                            <TableCell className="text-xs font-medium">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/ipos/${ipo.id}`}
                                  className="font-semibold text-foreground hover:underline"
                                >
                                  {ipo.name}
                                </Link>
                                <Badge
                                  variant={
                                    ipo.type === "sme" ? "outline" : "secondary"
                                  }
                                  className="px-1.5 py-0 font-mono text-[9px] uppercase"
                                >
                                  {ipo.type}
                                </Badge>
                              </div>
                              <span className="block text-[11px] text-muted-foreground">
                                {ipo.lotSize} shares / lot
                              </span>
                            </TableCell>

                            <TableCell className="text-xs">
                              <Badge
                                variant={
                                  derived.status === "open"
                                    ? "success"
                                    : derived.status === "upcoming"
                                      ? "outline"
                                      : "secondary"
                                }
                                className="px-2 py-0.5 text-xs font-medium"
                              >
                                {derived.label}
                              </Badge>
                              {ipo.closeDate && (
                                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                  Closes: {formatDate(ipo.closeDate)}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="text-right text-xs">
                              <span className="font-mono font-semibold text-foreground">
                                {formatCurrency(ipo.issuePrice)}
                              </span>
                              <span className="block font-mono text-[11px] text-muted-foreground">
                                {formatCurrency(minInvestment)} / lot
                              </span>
                            </TableCell>

                            <TableCell className="text-center text-xs">
                              <span className="font-mono font-semibold text-foreground">
                                {ipoApps.length} / {activeAccountsCount}
                              </span>
                              <span className="block text-[10px] text-muted-foreground">
                                accounts applied
                              </span>
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-7 text-xs"
                                nativeButton={false}
                                render={<Link href={`/ipos/${ipo.id}`} />}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Applications Ledger with Filter Tabs */}
          <Card className="rounded-none border border-border/70 shadow-xs">
            <CardHeader className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Application Activity & Returns
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time bidding records, allotment outcomes, and realized gains
                </CardDescription>
              </div>

              {/* Tabs Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-none border border-border/60 bg-muted/40 p-0.5 text-xs">
                  <button
                    onClick={() => setAppTab("recent")}
                    className={`rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                      appTab === "recent"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Recent Applications
                  </button>
                  <button
                    onClick={() => setAppTab("sold")}
                    className={`rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                      appTab === "sold"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Realized Sales ({soldApps.length})
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {(appTab === "recent" ? recentApps : soldApps).length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {appTab === "recent"
                    ? "No applications recorded yet. Open an IPO to apply with your accounts."
                    : "No sold applications recorded yet."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[550px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Account / IPO</TableHead>
                        <TableHead className="w-20 text-center text-xs">
                          Lots
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Bid Amount
                        </TableHead>
                        <TableHead className="w-24 text-center text-xs">
                          Status
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Your Profit
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(appTab === "recent" ? recentApps : soldApps).map(
                        (app) => {
                          const account = accountMap.get(app.accountId)
                          const ipo = ipoMap.get(app.ipoId)
                          const profit = ipo
                            ? calculateApplicationProfit(app, ipo, account)
                            : {
                                hasRealized: false,
                                realizedYourProfit: 0,
                                realizedProfitShared: 0,
                              }

                          return (
                            <TableRow key={app.id} className="hover:bg-muted/30">
                              <TableCell className="text-xs font-medium">
                                <span className="block font-semibold text-foreground">
                                  {account?.name || "Account"}
                                </span>
                                <span className="block text-[11px] text-muted-foreground">
                                  {ipo?.name || "IPO"}
                                </span>
                              </TableCell>

                              <TableCell className="text-center font-mono text-xs">
                                {app.lotsApplied}
                              </TableCell>

                              <TableCell className="text-right font-mono text-xs font-medium text-foreground">
                                {formatCurrency(app.amountApplied)}
                              </TableCell>

                              <TableCell className="text-center">
                                {getStatusBadge(app.status)}
                              </TableCell>

                              <TableCell className="text-right font-mono text-xs">
                                {profit.hasRealized ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span
                                      className={`font-bold ${
                                        profit.realizedYourProfit > 0
                                          ? "text-success"
                                          : profit.realizedYourProfit < 0
                                            ? "text-destructive"
                                            : "text-foreground"
                                      }`}
                                    >
                                      {formatCurrency(
                                        profit.realizedYourProfit
                                      )}
                                    </span>
                                    {account?.type === "other" && (
                                      <Badge
                                        variant={
                                          app.settlementStatus === "settled"
                                            ? "success"
                                            : "warning"
                                        }
                                        className="px-1 py-0 font-mono text-[8px]"
                                      >
                                        {app.settlementStatus === "settled"
                                          ? "Settled"
                                          : "Unsettled"}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        }
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          <DashboardCharts metrics={metrics} />
        </div>
      </div>
    </div>
  )
}
