"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  Plus,
  Layers,
  RefreshCw,
  TrendingUp,
  ExternalLink,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { IpoDetailSkeleton } from "@/components/ipo/ipo-detail-skeleton"
import { ApplicationTable } from "@/components/applications/application-table"
import { IpoDetailHeader } from "@/components/ipo/ipo-detail-header"
import { IpoDetailStats } from "@/components/ipo/ipo-detail-stats"
import { IpoDetailDialogs } from "@/components/ipo/ipo-detail-dialogs"
import { useIpoDetail } from "@/hooks/use-ipo-detail"
import { usePageTitle } from "@/hooks/use-page-title"
import type { Application } from "@/types"

export default function IpoDetailPage() {
  const {
    user,
    ipo,
    applications,
    accounts,
    bankAccounts,
    loading,
    notFound,
    fetchError,
    reloadData,
    handleRefreshData,
    handleToggleArchive,
    handleDelete,
    syncing,
    deleting,
    statusInfo,
    minAmount,
    moneySummary,
    profitSummary,
    hasAllottedApps,
    timelineSteps,
  } = useIpoDetail()

  usePageTitle(ipo?.name ?? "IPO Details")

  // Local dialog UI states
  const [editIpoOpen, setEditIpoOpen] = useState(false)
  const [priceDialogOpen, setPriceDialogOpen] = useState(false)
  const [deleteIpoOpen, setDeleteIpoOpen] = useState(false)
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [allotmentOpen, setAllotmentOpen] = useState(false)
  const [bulkSaleOpen, setBulkSaleOpen] = useState(false)
  const [checkAllotmentOpen, setCheckAllotmentOpen] = useState(false)
  const [appToSell, setAppToSell] = useState<Application | null>(null)
  const [appToSettle, setAppToSettle] = useState<Application | null>(null)
  const [appToEdit, setAppToEdit] = useState<Application | null>(null)

  if (loading) {
    return <IpoDetailSkeleton />
  }

  if (fetchError) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/ipos"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to My IPOs
        </Link>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertTriangle className="size-6 text-destructive" />
            </EmptyMedia>
            <EmptyTitle>Failed to load data</EmptyTitle>
            <EmptyDescription>
              Something went wrong while loading this IPO. Please check your
              connection and try again.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="sm"
              onClick={() => {
                reloadData()
              }}
            >
              <RefreshCw data-icon="inline-start" className="size-3.5" />
              Retry
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  if (notFound || !ipo || !statusInfo) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/ipos"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to My IPOs
        </Link>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>IPO not found</EmptyTitle>
            <EmptyDescription>
              The requested IPO could not be found or may have been deleted.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="sm"
              variant="outline"
              className="rounded-none"
              nativeButton={false}
              render={<Link href="/ipos" />}
            >
              Back to My IPOs
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Top Breadcrumb & Hero Card */}
      <IpoDetailHeader
        ipo={ipo}
        statusInfo={statusInfo}
        minAmount={minAmount}
        timelineSteps={timelineSteps}
        syncing={syncing}
        onRefreshData={handleRefreshData}
        onOpenPriceDialog={() => setPriceDialogOpen(true)}
        onOpenEditDialog={() => setEditIpoOpen(true)}
        onToggleArchive={handleToggleArchive}
        onOpenDeleteDialog={() => setDeleteIpoOpen(true)}
      />

      {/* 2. Financial Metrics & Profit Cards */}
      <IpoDetailStats
        moneySummary={moneySummary}
        profitSummary={profitSummary}
      />

      {/* 3. Applications Workspace Card */}
      <Card className="rounded-none border border-border/70">
        <CardHeader className="flex flex-col gap-2 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm font-bold">
              Applications ({applications.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Manage accounts, allotments, and listing sales for this IPO
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasAllottedApps && (
              <Button
                variant="outline"
                size="xs"
                className="h-7 text-xs"
                onClick={() => setBulkSaleOpen(true)}
              >
                <TrendingUp data-icon="inline-start" />
                Record Sale
              </Button>
            )}
            {applications.length > 0 && (
              <Button
                variant="outline"
                size="xs"
                className="h-7 text-xs"
                onClick={() => setCheckAllotmentOpen(true)}
              >
                <ExternalLink data-icon="inline-start" />
                Check Allotment
              </Button>
            )}
            {applications.length > 0 && (
              <Button
                variant="outline"
                size="xs"
                className="h-7 text-xs"
                onClick={() => setAllotmentOpen(true)}
              >
                <RefreshCw data-icon="inline-start" />
                Update Allotment
              </Button>
            )}
            <Button
              size="xs"
              className="h-7 text-xs"
              onClick={() => setBulkAddOpen(true)}
            >
              <Plus data-icon="inline-start" />
              Add Applications
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {applications.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Layers className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No applications recorded yet</EmptyTitle>
                <EmptyDescription>
                  Apply across multiple family & investor accounts in a single
                  batch.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={() => setBulkAddOpen(true)}>
                  <Plus data-icon="inline-start" />
                  Add First Applications
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ApplicationTable
              applications={applications}
              accounts={accounts}
              bankAccounts={bankAccounts}
              ipo={ipo}
              userId={user?.uid || ""}
              onEdit={(app) => setAppToEdit(app)}
              onRecordSale={(app) => setAppToSell(app)}
              onWhatsAppSettlement={(app) => setAppToSettle(app)}
              onRefresh={reloadData}
            />
          )}
        </CardContent>
      </Card>

      {/* 4. Modal Dialogs */}
      {user && (
        <IpoDetailDialogs
          user={user}
          ipo={ipo}
          applications={applications}
          accounts={accounts}
          bankAccounts={bankAccounts}
          deleteIpoOpen={deleteIpoOpen}
          setDeleteIpoOpen={setDeleteIpoOpen}
          deleting={deleting}
          onDeleteIpo={handleDelete}
          editIpoOpen={editIpoOpen}
          setEditIpoOpen={setEditIpoOpen}
          priceDialogOpen={priceDialogOpen}
          setPriceDialogOpen={setPriceDialogOpen}
          bulkAddOpen={bulkAddOpen}
          setBulkAddOpen={setBulkAddOpen}
          allotmentOpen={allotmentOpen}
          setAllotmentOpen={setAllotmentOpen}
          bulkSaleOpen={bulkSaleOpen}
          setBulkSaleOpen={setBulkSaleOpen}
          checkAllotmentOpen={checkAllotmentOpen}
          setCheckAllotmentOpen={setCheckAllotmentOpen}
          appToSell={appToSell}
          setAppToSell={setAppToSell}
          appToEdit={appToEdit}
          setAppToEdit={setAppToEdit}
          appToSettle={appToSettle}
          setAppToSettle={setAppToSettle}
          onReload={reloadData}
        />
      )}
    </div>
  )
}
