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
import { getApplications } from "@/lib/firebase/applications"
import { getApplicationAccounts } from "@/lib/firebase/accounts"
import { getBankAccounts } from "@/lib/firebase/bank-accounts"
import {
  calculateDashboardMetrics,
  calculateBankMoneySummary,
  calculateApplicationProfit,
} from "@/lib/calculations/financials"
import { exportPortfolioSummaryCsv } from "@/lib/utils/export-csv"
import { formatCurrency, formatDate, getIpoStatus } from "@/lib/utils/ipo"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
} from "@/types"

export default function DashboardPage() {
  const { user } = useAuth()

  const [ipos, setIpos] = useState<Ipo[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [accounts, setAccounts] = useState<ApplicationAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)

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
          setIpos(iposData)
          setApplications(appsData)
          setAccounts(accountsData)
          setBankAccounts(banksData)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load dashboard data:", err)
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user])

  if (loading) {
    return <DashboardSkeleton />
  }

  const metrics = calculateDashboardMetrics(ipos, applications, accounts)
  const ipoMap = new Map(ipos.map((i) => [i.id, i]))
  const accountMap = new Map(accounts.map((a) => [a.id, a]))

  // Active IPOs (not archived, upcoming/open/allotment_pending/closed)
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

  // Recent applications (most recent first)
  const recentApps = [...applications]
    .sort((a, b) => {
      const aTime = a.applicationDate?.seconds ?? 0
      const bTime = b.applicationDate?.seconds ?? 0
      return bTime - aTime
    })
    .slice(0, 6)

  // Empty state if nothing is tracked yet
  if (ipos.length === 0 && accounts.length === 0 && bankAccounts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Welcome to IPO Tracker — manage all your IPO applications,
            allotments, and profit sharing in one place
          </p>
        </div>

        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Sparkles />
            </EmptyMedia>
            <EmptyTitle>Get Started with IPO Tracker</EmptyTitle>
            <EmptyDescription>
              Start by setting up your Application Accounts (family/client
              accounts) and Bank Accounts, then add upcoming IPOs to record
              multi-account applications with one click.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                render={<Link href="/accounts" />}
              >
                <Users data-icon="inline-start" />
                Add Accounts
              </Button>
              <Button
                size="sm"
                variant="outline"
                render={<Link href="/bank-accounts" />}
              >
                <Landmark data-icon="inline-start" />
                Add Bank Accounts
              </Button>
              <Button size="sm" render={<Link href="/ipos" />}>
                <Plus data-icon="inline-start" />
                Add First IPO
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "allotted":
        return (
          <Badge
            variant="success"
            className="px-1.5 py-0 text-[10px] font-normal"
          >
            Allotted
          </Badge>
        )
      case "not_allotted":
        return (
          <Badge
            variant="secondary"
            className="px-1.5 py-0 text-[10px] font-normal"
          >
            Not Allotted
          </Badge>
        )
      case "sold":
        return (
          <Badge variant="info" className="px-1.5 py-0 text-[10px] font-normal">
            Sold
          </Badge>
        )
      case "pending":
      default:
        return (
          <Badge
            variant="outline"
            className="px-1.5 py-0 text-[10px] font-normal"
          >
            Pending
          </Badge>
        )
    }
  }

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

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Live capital overview, IPO schedules, and profit-sharing performance
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {applications.length > 0 && (
            <Button
              size="xs"
              variant="outline"
              className="text-xs"
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
          <Button size="xs" className="text-xs" render={<Link href="/ipos" />}>
            <Plus data-icon="inline-start" />
            Add IPO
          </Button>
        </div>
      </div>

      {/* 1. Primary Financial Performance Hero Card */}
      <Card className="overflow-hidden rounded-none border border-border/80 bg-card">
        <div className="grid grid-cols-1 divide-y divide-border/60 md:grid-cols-3 md:divide-x md:divide-y-0">
          {/* Net Realized Profit (You) */}
          <div className="flex flex-col justify-between gap-2 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Your Net Realized Profit
              </span>
              <TrendingUp className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p
                className={`font-mono text-2xl font-bold tracking-tight sm:text-3xl ${
                  metrics.totalYourRealizedProfit > 0
                    ? "text-success"
                    : metrics.totalYourRealizedProfit < 0
                      ? "text-destructive"
                      : "text-foreground"
                }`}
              >
                {formatCurrency(metrics.totalYourRealizedProfit)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {metrics.totalProfitShared > 0 ? (
                  <span>
                    + {formatCurrency(metrics.totalProfitShared)} shared with
                    account owners
                  </span>
                ) : (
                  <span>From {metrics.soldApplications} sold applications</span>
                )}
              </p>
            </div>
          </div>

          {/* Currently Blocked Mandates */}
          <div className="flex flex-col justify-between gap-2 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Currently Blocked
              </span>
              <Lock className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {formatCurrency(metrics.totalBlocked)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Across {metrics.pendingApplications} pending UPI mandates
              </p>
            </div>
          </div>

          {/* Total Invested (Allotted) */}
          <div className="flex flex-col justify-between gap-2 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Total Invested Capital
              </span>
              <CheckCircle2 className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {formatCurrency(metrics.totalInvested)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                In {metrics.allottedApplications + metrics.soldApplications}{" "}
                allotted applications
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Secondary Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Allotment Success Rate
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {successRate.toFixed(1)}%
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              {metrics.allottedApplications + metrics.soldApplications} of{" "}
              {totalDecided} decided
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Total Applications
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {metrics.totalApplications}
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              Across {accounts.filter((a) => !a.archived).length} active
              accounts
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Total Profit Shared
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(metrics.totalProfitShared)}
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              To family & investor accounts
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Expected Refunds
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(metrics.totalRefundExpected)}
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              From unallotted applications
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Two-Column Content Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (Span 2): Active IPOs + Recent Applications */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Active IPOs Tracker */}
          <Card className="rounded-none border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 p-4">
              <div>
                <CardTitle className="text-sm font-bold">
                  Active & Upcoming IPOs
                </CardTitle>
                <CardDescription className="text-xs">
                  IPOs currently in bidding or awaiting allotment results
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="text-xs"
                render={<Link href="/ipos" />}
              >
                All IPOs
                <ArrowRight data-icon="inline-end" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {activeIpos.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No active IPOs right now. Click &quot;Add IPO&quot; to track
                  upcoming IPOs.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">IPO Name</TableHead>
                        <TableHead className="text-xs">
                          Timeline / Status
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Price / Lot
                        </TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeIpos.map((ipo) => {
                        const derived = getIpoStatus(ipo)
                        const ipoApps = applications.filter(
                          (a) => a.ipoId === ipo.id
                        )

                        return (
                          <TableRow key={ipo.id}>
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
                                  className="px-1 py-0 font-mono text-[9px] uppercase"
                                >
                                  {ipo.type}
                                </Badge>
                              </div>
                              <span className="block text-[10px] text-muted-foreground">
                                {ipoApps.length > 0
                                  ? `${ipoApps.length} applications recorded`
                                  : "No applications yet"}
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
                                className="px-1.5 py-0 text-[10px] font-normal"
                              >
                                {derived.label}
                              </Badge>
                              {ipo.closeDate && (
                                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                                  Closes: {formatDate(ipo.closeDate)}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="text-right text-xs">
                              <span className="font-mono font-semibold text-foreground">
                                {formatCurrency(ipo.issuePrice)}
                              </span>
                              <span className="block text-[10px] text-muted-foreground">
                                {ipo.lotSize} sh/lot
                              </span>
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-7 text-xs"
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

          {/* Recent Applications Activity */}
          <Card className="rounded-none border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 p-4">
              <div>
                <CardTitle className="text-sm font-bold">
                  Recent Applications
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest IPO applications filed across your accounts
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="text-xs"
                render={<Link href="/ipos" />}
              >
                View Applications
                <ArrowRight data-icon="inline-end" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentApps.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No applications recorded yet. Open an IPO to apply with your
                  accounts.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">Account / IPO</TableHead>
                        <TableHead className="w-20 text-center text-xs">
                          Lots
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Amount
                        </TableHead>
                        <TableHead className="w-24 text-center text-xs">
                          Status
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Profit
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentApps.map((app) => {
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
                          <TableRow key={app.id}>
                            <TableCell className="text-xs font-medium">
                              <span className="block font-semibold text-foreground">
                                {account?.name || "Account"}
                              </span>
                              <span className="block text-[10px] text-muted-foreground">
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
                                <span
                                  className={`font-bold ${
                                    profit.realizedYourProfit > 0
                                      ? "text-success"
                                      : profit.realizedYourProfit < 0
                                        ? "text-destructive"
                                        : "text-foreground"
                                  }`}
                                >
                                  {formatCurrency(profit.realizedYourProfit)}
                                </span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  —
                                </span>
                              )}
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
        </div>

        {/* Right Column (Span 1): Visual Charts & Bank Money State */}
        <div className="flex flex-col gap-6">
          {/* Charts Widget */}
          <DashboardCharts metrics={metrics} />

          {/* Bank Accounts Cash Snapshot */}
          <Card className="rounded-none border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 p-4">
              <div>
                <CardTitle className="text-sm font-bold">
                  Bank Accounts Cash State
                </CardTitle>
                <CardDescription className="text-xs">
                  Active mandates vs. invested capital by bank
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="text-xs"
                render={<Link href="/bank-accounts" />}
              >
                Manage
                <ArrowRight data-icon="inline-end" />
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 p-3">
              {bankAccounts.filter((b) => !b.archived).length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No bank accounts configured.
                </div>
              ) : (
                bankAccounts
                  .filter((b) => !b.archived)
                  .map((bank) => {
                    const summary = calculateBankMoneySummary(
                      bank.id,
                      applications,
                      ipoMap
                    )
                    return (
                      <div
                        key={bank.id}
                        className="flex items-center justify-between rounded-none border border-border/50 bg-muted/20 p-2.5 text-xs"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Landmark className="size-4 shrink-0 text-muted-foreground" />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-semibold text-foreground">
                              {bank.nickname || bank.bankName}
                            </span>
                            {bank.last4 && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                ••{bank.last4}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          {summary.blockedAmount > 0 && (
                            <span className="block font-mono text-[11px] font-semibold text-warning-foreground">
                              Blocked: {formatCurrency(summary.blockedAmount)}
                            </span>
                          )}
                          <span className="block font-mono text-[10px] text-muted-foreground">
                            Invested: {formatCurrency(summary.investedAmount)}
                          </span>
                        </div>
                      </div>
                    )
                  })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
