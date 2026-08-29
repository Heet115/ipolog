"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  TrendingUp,
  Lock,
  CheckCircle2,
  Layers,
  Users,
  Landmark,
  ArrowRight,
  Plus,
  Loader2,
  DollarSign,
  Briefcase,
  Download,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/lib/firebase/auth-context"
import { getIpos } from "@/lib/firebase/ipos"
import { getApplications } from "@/lib/firebase/applications"
import { getApplicationAccounts } from "@/lib/firebase/accounts"
import { getBankAccounts } from "@/lib/firebase/bank-accounts"
import {
  calculateDashboardMetrics,
  calculateBankMoneySummary,
  calculateAccountMoneySummary,
} from "@/lib/calculations/financials"
import { exportPortfolioSummaryCsv } from "@/lib/utils/export-csv"
import {
  formatCurrency,
  formatDate,
  formatBankAccount,
  getIpoStatus,
} from "@/lib/utils/ipo"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
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
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const metrics = calculateDashboardMetrics(ipos, applications, accounts)
  const ipoMap = new Map(ipos.map((i) => [i.id, i]))
  const accountMap = new Map(accounts.map((a) => [a.id, a]))

  // Active IPOs (not archived, upcoming/open/allotment_pending)
  const activeIpos = ipos
    .filter((ipo) => !ipo.archived)
    .filter((ipo) => {
      const st = getIpoStatus(ipo).status
      return st === "upcoming" || st === "open" || st === "allotment_pending" || st === "closed"
    })

  // Recent applications (sorted by date/created)
  const recentApps = [...applications].slice(0, 7)

  // Empty state if nothing is tracked yet
  if (ipos.length === 0 && accounts.length === 0 && bankAccounts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Welcome to IPO Tracker — manage all your IPO applications and profit sharing in one place
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <Briefcase className="size-7" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Get Started with IPO Tracker
            </h2>
            <p className="mt-1.5 max-w-md text-xs text-muted-foreground leading-relaxed">
              Start by setting up your Application Accounts (family/client accounts) and Bank Accounts, then add upcoming IPOs to record multi-account applications with one click.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="sm"
                variant="outline"
                render={<Link href="/accounts" />}
              >
                <Users className="mr-1.5 size-3.5" />
                Add Accounts
              </Button>
              <Button
                size="sm"
                variant="outline"
                render={<Link href="/bank-accounts" />}
              >
                <Landmark className="mr-1.5 size-3.5" />
                Add Bank Accounts
              </Button>
              <Button
                size="sm"
                render={<Link href="/ipos" />}
              >
                <Plus className="mr-1.5 size-3.5" />
                Add First IPO
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Comprehensive portfolio overview, money states, and profit sharing breakdown
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
              <Download className="mr-1.5 size-3" />
              Export Report
            </Button>
          )}
          <Button
            size="xs"
            variant="outline"
            className="text-xs"
            render={<Link href="/ipos" />}
          >
            <Plus className="mr-1.5 size-3" />
            New IPO
          </Button>
          <Button
            size="xs"
            className="text-xs"
            render={<Link href="/ipos" />}
          >
            View All IPOs
            <ArrowRight className="ml-1.5 size-3" />
          </Button>
        </div>
      </div>

      {/* 8 Metric Cards Grid (Section 6 & 21) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Currently Blocked Money */}
        <Card className={metrics.totalBlocked > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Currently Blocked
              </span>
              <div className="rounded bg-amber-500/10 p-1 text-amber-600 dark:text-amber-400">
                <Lock className="size-3.5" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(metrics.totalBlocked)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {metrics.pendingApplications} Pending Applications
            </p>
          </CardContent>
        </Card>

        {/* Total Invested */}
        <Card className={metrics.totalInvested > 0 ? "border-emerald-500/40 bg-emerald-500/5" : ""}>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Total Invested
              </span>
              <div className="rounded bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(metrics.totalInvested)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {metrics.allottedApplications + metrics.soldApplications} Allotted Applications
            </p>
          </CardContent>
        </Card>

        {/* Your Realized Net Profit */}
        <Card className="border-emerald-500/50 bg-emerald-500/10">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-950 dark:text-emerald-200">
                Your Realized Profit
              </span>
              <div className="rounded bg-emerald-600 p-1 text-white">
                <TrendingUp className="size-3.5" />
              </div>
            </div>
            <p
              className={`text-xl font-black ${
                metrics.totalYourRealizedProfit > 0
                  ? "text-emerald-700 dark:text-emerald-300"
                  : metrics.totalYourRealizedProfit < 0
                    ? "text-destructive"
                    : "text-foreground"
              }`}
            >
              {formatCurrency(metrics.totalYourRealizedProfit)}
            </p>
            <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80">
              Net profit retained after splits
            </p>
          </CardContent>
        </Card>

        {/* Profit Shared with Others */}
        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Profit Shared (Others)
              </span>
              <div className="rounded bg-amber-500/10 p-1 text-amber-600 dark:text-amber-400">
                <Users className="size-3.5" />
              </div>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(metrics.totalProfitShared)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Distributed to Other Accounts
            </p>
          </CardContent>
        </Card>

        {/* Total Gross Realized Profit */}
        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Gross Realized Profit
              </span>
              <DollarSign className="size-3.5 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(metrics.totalGrossRealizedProfit)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Total IPO profit generated
            </p>
          </CardContent>
        </Card>

        {/* Unrealized Gain */}
        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Unrealized Gain (CMP)
              </span>
              <TrendingUp className="size-3.5 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(metrics.totalUnrealizedProfit)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              On unsold allotted shares
            </p>
          </CardContent>
        </Card>

        {/* Total Applications */}
        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Total Applications
              </span>
              <Layers className="size-3.5 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {metrics.totalApplications}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {metrics.allottedApplications} Allotted • {metrics.pendingApplications} Pending • {metrics.soldApplications} Sold
            </p>
          </CardContent>
        </Card>

        {/* Total IPOs Tracked */}
        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Tracked IPOs
              </span>
              <Briefcase className="size-3.5 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {metrics.totalIpos}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {metrics.activeIposCount} Active • {metrics.mainboardCount} Mainboard • {metrics.smeCount} SME
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2-Column Section: Active IPOs & Bank Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active IPOs Widget */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">
                Active IPOs ({activeIpos.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Currently open, upcoming, or awaiting allotment
              </p>
            </div>
            <Button
              variant="ghost"
              size="xs"
              className="text-xs"
              render={<Link href="/ipos" />}
            >
              All IPOs
              <ArrowRight className="ml-1 size-3" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 space-y-2">
            {activeIpos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                <Briefcase className="mb-2 size-6 text-muted-foreground/40" />
                No currently active IPOs. Add one from the IPOs tab.
              </div>
            ) : (
              <div className="space-y-2">
                {activeIpos.slice(0, 4).map((ipo) => {
                  const statusInfo = getIpoStatus(ipo)
                  const ipoApps = applications.filter((a) => a.ipoId === ipo.id)
                  const blocked = ipoApps
                    .filter((a) => a.status === "pending")
                    .reduce((sum, a) => sum + a.amountApplied, 0)

                  return (
                    <Link
                      key={ipo.id}
                      href={`/ipos/${ipo.id}`}
                      className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-foreground">
                              {ipo.name}
                            </span>
                            <Badge
                              variant={ipo.type === "sme" ? "secondary" : "outline"}
                              className="text-[9px] py-0 px-1 uppercase font-normal"
                            >
                              {ipo.type}
                            </Badge>
                            <Badge
                              variant={statusInfo.variant}
                              className="text-[9px] py-0 px-1 font-normal"
                            >
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground block mt-0.5">
                            Issue: {formatCurrency(ipo.issuePrice)} • {ipo.lotSize} sh/lot
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-foreground block">
                            {ipoApps.length} Apps
                          </span>
                          {blocked > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                              {formatCurrency(blocked)} blocked
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bank Blocked Money Breakdown Widget */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">
                Bank Blocked Money Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Funds currently locked in application mandates per bank
              </p>
            </div>
            <Button
              variant="ghost"
              size="xs"
              className="text-xs"
              render={<Link href="/bank-accounts" />}
            >
              Manage Banks
              <ArrowRight className="ml-1 size-3" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {bankAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                <Landmark className="mb-2 size-6 text-muted-foreground/40" />
                No bank accounts added yet.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Bank Account</TableHead>
                      <TableHead className="text-xs text-right">Blocked</TableHead>
                      <TableHead className="text-xs text-right">Invested</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.slice(0, 5).map((bank) => {
                      const summary = calculateBankMoneySummary(
                        bank.id,
                        applications,
                        ipoMap
                      )

                      return (
                        <TableRow key={bank.id}>
                          <TableCell className="text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                              <Landmark className="size-3 text-muted-foreground" />
                              <span>{formatBankAccount(bank)}</span>
                            </div>
                          </TableCell>
                          <TableCell
                            className={`text-right text-xs font-semibold ${
                              summary.blockedAmount > 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatCurrency(summary.blockedAmount)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium text-foreground">
                            {formatCurrency(summary.investedAmount)}
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

      {/* Account Performance Breakdown & Recent Applications Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Performance Breakdown */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">
                Account Profit & Performance
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Performance summary across My Accounts and Other Accounts
              </p>
            </div>
            <Button
              variant="ghost"
              size="xs"
              className="text-xs"
              render={<Link href="/accounts" />}
            >
              All Accounts
              <ArrowRight className="ml-1 size-3" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                <Users className="mb-2 size-6 text-muted-foreground/40" />
                No application accounts added yet.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Account</TableHead>
                      <TableHead className="text-xs text-center">Apps</TableHead>
                      <TableHead className="text-xs text-right">Invested</TableHead>
                      <TableHead className="text-xs text-right">Profit (You)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.slice(0, 5).map((acc) => {
                      const summary = calculateAccountMoneySummary(
                        acc.id,
                        applications,
                        ipoMap,
                        acc
                      )

                      return (
                        <TableRow key={acc.id}>
                          <TableCell className="text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{acc.name}</span>
                              <Badge
                                variant={acc.type === "my" ? "secondary" : "default"}
                                className="text-[9px] py-0 px-1 font-normal"
                              >
                                {acc.type === "my" ? "My" : `${acc.profitSharePercent}%`}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {summary.totalApplications}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium text-foreground">
                            {formatCurrency(summary.totalInvested)}
                          </TableCell>
                          <TableCell
                            className={`text-right text-xs font-bold ${
                              summary.totalRealizedYourProfit > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : summary.totalRealizedYourProfit < 0
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {formatCurrency(summary.totalRealizedYourProfit)}
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

        {/* Recent Applications Feed */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">
                Recent Applications
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Latest IPO applications recorded across all accounts
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {recentApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                <Layers className="mb-2 size-6 text-muted-foreground/40" />
                No applications recorded yet.
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">IPO / Account</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentApps.map((app) => {
                      const ipo = ipoMap.get(app.ipoId)
                      const acc = accountMap.get(app.accountId)

                      return (
                        <TableRow key={app.id}>
                          <TableCell className="text-xs">
                            <Link
                              href={`/ipos/${app.ipoId}`}
                              className="font-medium text-foreground hover:underline block truncate"
                            >
                              {ipo?.name || "IPO"}
                            </Link>
                            <span className="text-[10px] text-muted-foreground block">
                              {acc?.name} • {formatDate(app.applicationDate)}
                            </span>
                          </TableCell>

                          <TableCell className="text-right text-xs font-semibold text-foreground">
                            {formatCurrency(app.amountApplied)}
                          </TableCell>

                          <TableCell className="text-center text-xs">
                            <Badge
                              variant={
                                app.status === "allotted"
                                  ? "default"
                                  : app.status === "sold"
                                    ? "default"
                                    : "outline"
                              }
                              className={`text-[9px] py-0 px-1 font-normal ${
                                app.status === "allotted"
                                  ? "bg-emerald-600 text-white"
                                  : app.status === "sold"
                                    ? "bg-blue-600 text-white"
                                    : ""
                              }`}
                            >
                              {app.status}
                            </Badge>
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
    </div>
  )
}
