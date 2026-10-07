"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { DashboardOnboarding } from "@/components/dashboard/dashboard-onboarding"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardAsbaAlert } from "@/components/dashboard/dashboard-asba-alert"
import { DashboardCommandCenter } from "@/components/dashboard/dashboard-command-center"
import { DashboardSecondaryMetrics } from "@/components/dashboard/dashboard-secondary-metrics"
import { DashboardActiveIpos } from "@/components/dashboard/dashboard-active-ipos"
import { DashboardRecentApps } from "@/components/dashboard/dashboard-recent-apps"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { usePageTitle } from "@/hooks/use-page-title"

export default function DashboardPage() {
  usePageTitle("Dashboard")

  const {
    applications,
    accounts,
    loading,
    fetchError,
    retry,
    metrics,
    ipoMap,
    accountMap,
    receivables,
    activeIpos,
    openIpos,
    allotmentIpos,
    recentApps,
    soldApps,
    totalAsbaLimit,
    asbaUtilization,
    exceededWarnings,
    totalDecided,
    successRate,
    totalInMotion,
    investedPct,
    blockedPct,
    refundPct,
    userName,
    isCompletelyEmpty,
  } = useDashboardData()

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
            Something went wrong while connecting to your portfolio. Please
            check your connection and try again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" onClick={retry}>
            <RefreshCw data-icon="inline-start" className="size-3.5" />
            Retry
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (isCompletelyEmpty) {
    return <DashboardOnboarding />
  }

  const activeAccountsCount = accounts.filter((a) => !a.archived).length
  const partnerAccountsCount = accounts.filter(
    (a) => a.type === "other" && !a.archived
  ).length

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header with Time-Aware Greeting & Live Status */}
      <DashboardHeader userName={userName} />

      {/* 2. ASBA Limit Critical Alerts */}
      <DashboardAsbaAlert exceededWarnings={exceededWarnings} />

      {/* 3. Executive Financial Command Center (Hero Card) */}
      <DashboardCommandCenter
        metrics={metrics}
        activeAccountsCount={activeAccountsCount}
        successRate={successRate}
        totalDecided={totalDecided}
        totalInMotion={totalInMotion}
        investedPct={investedPct}
        blockedPct={blockedPct}
        refundPct={refundPct}
      />

      {/* 4. Secondary Operational Metrics */}
      <DashboardSecondaryMetrics
        receivables={receivables}
        metrics={metrics}
        partnerAccountsCount={partnerAccountsCount}
        asbaUtilization={asbaUtilization}
        totalAsbaLimit={totalAsbaLimit}
      />

      {/* 5. Main Power Layout (Active IPOs + Application Activity + Charts) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <DashboardActiveIpos
            activeIpos={activeIpos}
            openIpos={openIpos}
            allotmentIpos={allotmentIpos}
            applications={applications}
            accounts={accounts}
          />

          <DashboardRecentApps
            recentApps={recentApps}
            soldApps={soldApps}
            ipoMap={ipoMap}
            accountMap={accountMap}
          />

          <DashboardCharts metrics={metrics} />
        </div>
      </div>
    </div>
  )
}
