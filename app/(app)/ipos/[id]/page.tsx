"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  FileText,
  Plus,
  Layers,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Download,
  Check,
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
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/toast"
import { IpoDialog } from "@/components/ipo/ipo-dialog"
import { IpoPriceDialog } from "@/components/ipo/ipo-price-dialog"
import { IpoDetailSkeleton } from "@/components/ipo/ipo-detail-skeleton"
import { BulkApplicationDialog } from "@/components/applications/bulk-application-dialog"
import { BulkAllotmentDialog } from "@/components/applications/bulk-allotment-dialog"
import { BulkSaleDialog } from "@/components/applications/bulk-sale-dialog"
import { RecordSaleDialog } from "@/components/applications/record-sale-dialog"
import { EditApplicationDialog } from "@/components/applications/edit-application-dialog"
import { ApplicationTable } from "@/components/applications/application-table"
import { useAuth } from "@/lib/firebase/auth-context"
import { getIpoById, archiveIpo, deleteIpo } from "@/lib/firebase/ipos"
import { getApplicationsByIpo } from "@/lib/firebase/applications"
import { getApplicationAccounts } from "@/lib/firebase/accounts"
import { getBankAccounts } from "@/lib/firebase/bank-accounts"
import { getIpoStatus, formatCurrency, formatDate } from "@/lib/utils/ipo"
import { exportIpoApplicationsCsv } from "@/lib/utils/export-csv"
import {
  calculateIpoMoneySummary,
  calculateIpoProfitSummary,
} from "@/lib/calculations/financials"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

export default function IpoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const ipoId = typeof params?.id === "string" ? params.id : ""

  const [ipo, setIpo] = useState<Ipo | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [accounts, setAccounts] = useState<ApplicationAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Dialog states
  const [editIpoOpen, setEditIpoOpen] = useState(false)
  const [priceDialogOpen, setPriceDialogOpen] = useState(false)
  const [deleteIpoOpen, setDeleteIpoOpen] = useState(false)
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [allotmentOpen, setAllotmentOpen] = useState(false)
  const [bulkSaleOpen, setBulkSaleOpen] = useState(false)
  const [appToSell, setAppToSell] = useState<Application | null>(null)
  const [appToEdit, setAppToEdit] = useState<Application | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const reloadData = useCallback(async () => {
    if (!user || !ipoId) return
    try {
      const [ipoData, appsData, accountsData, banksData] = await Promise.all([
        getIpoById(user.uid, ipoId),
        getApplicationsByIpo(user.uid, ipoId),
        getApplicationAccounts(user.uid, true),
        getBankAccounts(user.uid, true),
      ])

      if (!ipoData) {
        setNotFound(true)
      } else {
        setIpo(ipoData)
        setApplications(appsData)
        setAccounts(accountsData)
        setBankAccounts(banksData)
      }
    } catch (err) {
      console.error("Failed to load IPO details:", err)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [user, ipoId])

  useEffect(() => {
    let ignore = false
    if (!user || !ipoId) return

    Promise.all([
      getIpoById(user.uid, ipoId),
      getApplicationsByIpo(user.uid, ipoId),
      getApplicationAccounts(user.uid, true),
      getBankAccounts(user.uid, true),
    ])
      .then(([ipoData, appsData, accountsData, banksData]) => {
        if (!ignore) {
          if (!ipoData) {
            setNotFound(true)
          } else {
            setIpo(ipoData)
            setApplications(appsData)
            setAccounts(accountsData)
            setBankAccounts(banksData)
          }
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load IPO details:", err)
        if (!ignore) {
          setNotFound(true)
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user, ipoId])

  const handleRefreshData = async () => {
    if (!user || !ipo || !ipo.externalId) return
    setSyncing(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/ipos/${ipo.id}/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to refresh IPO data.")
      }

      toast.add({
        title: "Data Refreshed",
        description: `${ipo.name} updated from Upstox.`,
        type: "success",
      })
      reloadData()
    } catch (err: unknown) {
      console.error("Failed to sync IPO data:", err)
      toast.add({
        title: "Refresh Failed",
        description:
          err instanceof Error
            ? err.message
            : "Could not refresh IPO data. Please try again.",
        type: "error",
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleToggleArchive = async () => {
    if (!user || !ipo) return
    try {
      await archiveIpo(user.uid, ipo.id, !ipo.archived)
      toast.add({
        title: ipo.archived ? "IPO restored" : "IPO archived",
        type: "success",
      })
      reloadData()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to update IPO archive state",
        type: "error",
      })
    }
  }

  const handleDelete = async () => {
    if (!user || !ipo) return
    setDeleting(true)
    try {
      await deleteIpo(user.uid, ipo.id)
      toast.add({
        title: "IPO deleted",
        type: "success",
      })
      router.replace("/ipos")
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to delete IPO",
        type: "error",
      })
      setDeleting(false)
    }
  }

  if (loading) {
    return <IpoDetailSkeleton />
  }

  if (notFound || !ipo) {
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
            <Button size="sm" variant="outline" render={<Link href="/ipos" />}>
              Back to My IPOs
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  const statusInfo = getIpoStatus(ipo)
  const minAmount = ipo.issuePrice * ipo.lotSize
  const accountsMap = new Map(accounts.map((a) => [a.id, a]))

  // Financial and profit summaries
  const moneySummary = calculateIpoMoneySummary(applications, ipo.issuePrice)
  const profitSummary = calculateIpoProfitSummary(
    applications,
    ipo,
    accountsMap
  )

  const hasAllottedApps = applications.some(
    (a) => a.status === "allotted" || a.status === "sold"
  )

  // Timeline milestones
  const isListed = statusInfo.status === "listed"
  const isAllotmentOut = isListed || statusInfo.status === "allotment_pending"
  const isClosed = isAllotmentOut || statusInfo.status === "closed"
  const isOpened = isClosed || statusInfo.status === "open"

  const timelineSteps = [
    { label: "Bidding Opens", date: ipo.openDate, done: isOpened },
    { label: "Bidding Closes", date: ipo.closeDate, done: isClosed },
    { label: "Allotment", date: ipo.allotmentDate, done: isAllotmentOut },
    { label: "Listing Day", date: ipo.listingDate, done: isListed },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Top Breadcrumb & Quick Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/ipos"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to My IPOs
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {Boolean(ipo.externalId) && (
            <Button
              variant="outline"
              size="xs"
              onClick={handleRefreshData}
              disabled={syncing}
              className="h-7 text-xs"
            >
              <RefreshCw
                className={`size-3.5 ${syncing ? "animate-spin" : ""}`}
                data-icon="inline-start"
              />
              {syncing ? "Syncing..." : "Refresh Data"}
            </Button>
          )}
          <Button
            variant="outline"
            size="xs"
            onClick={() => setPriceDialogOpen(true)}
            className="h-7 text-xs"
          >
            <DollarSign data-icon="inline-start" />
            Market Prices
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setEditIpoOpen(true)}
            className="h-7 text-xs"
          >
            <Edit2 data-icon="inline-start" />
            Edit IPO
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleToggleArchive}
            className="h-7 text-xs"
          >
            {ipo.archived ? (
              <>
                <ArchiveRestore data-icon="inline-start" />
                Restore
              </>
            ) : (
              <>
                <Archive data-icon="inline-start" />
                Archive
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="xs"
            onClick={() => setDeleteIpoOpen(true)}
            className="h-7 text-xs"
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main IPO Header Hero Card */}
      <Card className="rounded-none border border-border/70 bg-card">
        <CardContent className="flex flex-col gap-5 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                  {ipo.name}
                </h1>
                {ipo.symbol && (
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 font-mono text-[10px]"
                  >
                    {ipo.symbol}
                  </Badge>
                )}
                <Badge
                  variant={ipo.type === "sme" ? "secondary" : "outline"}
                  className="px-1.5 py-0 font-mono text-[10px] uppercase"
                >
                  {ipo.type}
                </Badge>
                <Badge
                  variant={statusInfo.variant}
                  className="px-1.5 py-0 text-[10px] font-normal"
                >
                  {statusInfo.label}
                </Badge>
                {ipo.provider && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 px-1.5 py-0 font-mono text-[10px] uppercase text-primary"
                  >
                    {ipo.provider}
                  </Badge>
                )}
                {ipo.archived && (
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 font-mono text-[10px]"
                  >
                    Archived
                  </Badge>
                )}
              </div>
              {ipo.companyName && (
                <p className="font-mono text-xs text-muted-foreground">
                  {ipo.companyName}
                  {ipo.lastSyncedAt && (
                    <span className="ml-2 text-[11px] text-muted-foreground/80">
                      • Last synced: {formatDate(ipo.lastSyncedAt)}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Price Highlights */}
            <div className="flex flex-wrap items-center gap-4 sm:text-right">
              <div>
                <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                  Issue Price
                </span>
                <span className="font-mono text-lg font-bold text-foreground sm:text-xl">
                  {formatCurrency(ipo.issuePrice)}
                </span>
                <span className="block font-mono text-[11px] text-muted-foreground">
                  {ipo.lotSize} sh / lot
                </span>
              </div>

              {ipo.listingPrice && (
                <div className="border-t border-border/60 pt-2 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-4">
                  <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                    Listing Price
                  </span>
                  <span className="font-mono text-lg font-bold text-success sm:text-xl">
                    {formatCurrency(ipo.listingPrice)}
                  </span>
                  <span className="block font-mono text-[11px] text-success">
                    +
                    {(
                      ((ipo.listingPrice - ipo.issuePrice) / ipo.issuePrice) *
                      100
                    ).toFixed(1)}
                    % Gain
                  </span>
                </div>
              )}

              {ipo.currentPrice && (
                <div className="border-t border-border/60 pt-2 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-4">
                  <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                    Current (CMP)
                  </span>
                  <span className="font-mono text-lg font-bold text-foreground sm:text-xl">
                    {formatCurrency(ipo.currentPrice)}
                  </span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {(
                      ((ipo.currentPrice - ipo.issuePrice) / ipo.issuePrice) *
                      100
                    ).toFixed(1)}
                    % vs Issue
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-none border border-border/50 bg-muted/40 p-3 text-xs sm:grid-cols-4">
            <div>
              <span className="block text-[11px] text-muted-foreground">
                Lot Size
              </span>
              <span className="font-mono font-semibold text-foreground">
                {ipo.lotSize} shares
              </span>
            </div>

            <div>
              <span className="block text-[11px] text-muted-foreground">
                1 Lot Mandate
              </span>
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(minAmount)}
              </span>
            </div>

            <div>
              <span className="block text-[11px] text-muted-foreground">
                Price Band
              </span>
              <span className="font-mono font-semibold text-foreground">
                {ipo.priceBandMin && ipo.priceBandMax
                  ? `₹${ipo.priceBandMin} - ₹${ipo.priceBandMax}`
                  : "Fixed Price"}
              </span>
            </div>

            <div>
              <span className="block text-[11px] text-muted-foreground">
                Category
              </span>
              <span className="font-semibold text-foreground capitalize">
                {ipo.type === "mainboard" ? "Mainboard Issue" : "SME Issue"}
              </span>
            </div>
          </div>

          {/* Timeline Milestones */}
          {(ipo.openDate ||
            ipo.closeDate ||
            ipo.allotmentDate ||
            ipo.listingDate) && (
            <div className="rounded-none border border-border/40 bg-muted/20 p-3">
              <span className="mb-2 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Timeline & Milestones
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                {timelineSteps.map((step, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {step.done ? (
                        <Check className="size-3 shrink-0 text-success" />
                      ) : (
                        <Calendar className="size-3 shrink-0" />
                      )}
                      <span>{step.label}</span>
                    </div>
                    <span className="pl-4.5 font-mono text-[11px] font-semibold text-foreground">
                      {formatDate(step.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ipo.notes && (
            <p className="rounded-none border border-border/40 bg-muted/30 p-2.5 text-xs text-muted-foreground">
              <strong className="text-foreground">Notes: </strong>
              {ipo.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 4-Metric Money State Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Applied */}
        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Total Applied
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(moneySummary.totalApplied)}
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              {moneySummary.applicationsCount} Applications (
              {moneySummary.totalLotsApplied} Lots)
            </span>
          </CardContent>
        </Card>

        {/* Currently Blocked */}
        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Currently Blocked
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(moneySummary.blockedAmount)}
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              {moneySummary.pendingCount} Pending Mandates
            </span>
          </CardContent>
        </Card>

        {/* Total Invested */}
        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Total Invested
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(moneySummary.investedAmount)}
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              {moneySummary.soldCount > 0
                ? `${moneySummary.allottedCount} Holding • ${moneySummary.soldCount} Sold (${moneySummary.totalAllottedShares} Sh Total)`
                : `${moneySummary.allottedCount} Allotted (${moneySummary.totalAllottedShares} Shares)`}
            </span>
          </CardContent>
        </Card>

        {/* Expected Refund */}
        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Expected Refund
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(moneySummary.refundExpected)}
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              {moneySummary.notAllottedCount} Unallotted Applications
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Profit & Return Summary (shown when P&L exists) */}
      {profitSummary.hasAnyProfit && (
        <Card className="rounded-none border border-border/70 bg-card">
          <CardHeader className="border-b border-border/60 p-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <TrendingUp className="size-4 text-success" />
              Profit & Return Realization
            </CardTitle>
            <CardDescription className="text-xs">
              Realized profits and profit-sharing distributions for this IPO
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-0.5 rounded-none border border-border/50 bg-muted/30 p-3">
                <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                  Your Net Profit
                </span>
                <span
                  className={`font-mono text-lg font-bold ${
                    profitSummary.totalRealizedYourProfit > 0
                      ? "text-success"
                      : profitSummary.totalRealizedYourProfit < 0
                        ? "text-destructive"
                        : "text-foreground"
                  }`}
                >
                  {formatCurrency(profitSummary.totalRealizedYourProfit)}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  After profit sharing deductions
                </span>
              </div>

              <div className="flex flex-col gap-0.5 rounded-none border border-border/50 bg-muted/30 p-3">
                <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                  Profit Shared (Others)
                </span>
                <span className="font-mono text-lg font-bold text-warning-foreground">
                  {formatCurrency(profitSummary.totalRealizedProfitShared)}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  To account owners
                </span>
              </div>

              <div className="flex flex-col gap-0.5 rounded-none border border-border/50 bg-muted/30 p-3">
                <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                  Total Gross Profit
                </span>
                <span className="font-mono text-lg font-bold text-foreground">
                  {formatCurrency(profitSummary.totalRealizedGrossProfit)}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  Total realized return
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications Workspace Card */}
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
            {applications.length > 0 && (
              <Button
                variant="outline"
                size="xs"
                className="h-7 text-xs"
                onClick={() => {
                  exportIpoApplicationsCsv(
                    ipo,
                    applications,
                    accounts,
                    bankAccounts
                  )
                  toast.add({
                    title: "Applications exported to CSV",
                    type: "success",
                  })
                }}
              >
                <Download data-icon="inline-start" />
                Export CSV
              </Button>
            )}
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
              onRefresh={reloadData}
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteIpoOpen} onOpenChange={setDeleteIpoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete IPO?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{ipo.name}</strong>? All linked application records will
              also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete IPO"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Workflows */}
      {user && (
        <>
          <IpoDialog
            open={editIpoOpen}
            onOpenChange={setEditIpoOpen}
            userId={user.uid}
            ipoToEdit={ipo}
            onSuccess={() => reloadData()}
          />
          <IpoPriceDialog
            open={priceDialogOpen}
            onOpenChange={setPriceDialogOpen}
            userId={user.uid}
            ipo={ipo}
            onSuccess={() => reloadData()}
          />
          <BulkApplicationDialog
            open={bulkAddOpen}
            onOpenChange={setBulkAddOpen}
            userId={user.uid}
            ipo={ipo}
            existingApplications={applications}
            accounts={accounts}
            bankAccounts={bankAccounts}
            onSuccess={() => reloadData()}
          />
          <BulkAllotmentDialog
            open={allotmentOpen}
            onOpenChange={setAllotmentOpen}
            userId={user.uid}
            ipo={ipo}
            applications={applications}
            accounts={accounts}
            bankAccounts={bankAccounts}
            onSuccess={() => reloadData()}
          />
          <BulkSaleDialog
            open={bulkSaleOpen}
            onOpenChange={setBulkSaleOpen}
            userId={user.uid}
            ipo={ipo}
            applications={applications}
            accounts={accounts}
            onSuccess={() => reloadData()}
          />
          {appToSell && (
            <RecordSaleDialog
              open={true}
              onOpenChange={(open) => !open && setAppToSell(null)}
              userId={user.uid}
              ipo={ipo}
              application={appToSell}
              account={accounts.find((a) => a.id === appToSell.accountId)}
              onSuccess={() => {
                setAppToSell(null)
                reloadData()
              }}
            />
          )}
          {appToEdit && (
            <EditApplicationDialog
              open={true}
              onOpenChange={(open) => !open && setAppToEdit(null)}
              userId={user.uid}
              ipo={ipo}
              application={appToEdit}
              account={accounts.find((a) => a.id === appToEdit.accountId)}
              bankAccounts={bankAccounts}
              onSuccess={() => {
                setAppToEdit(null)
                reloadData()
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
