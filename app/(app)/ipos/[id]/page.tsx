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
  Loader2,
  Layers,
  Banknote,
  Lock,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Download,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
} from "@/types"

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

  // Dialogs
  const [editIpoOpen, setEditIpoOpen] = useState(false)
  const [priceDialogOpen, setPriceDialogOpen] = useState(false)
  const [deleteIpoOpen, setDeleteIpoOpen] = useState(false)
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [allotmentOpen, setAllotmentOpen] = useState(false)
  const [bulkSaleOpen, setBulkSaleOpen] = useState(false)
  const [appToSell, setAppToSell] = useState<Application | null>(null)
  const [appToEdit, setAppToEdit] = useState<Application | null>(null)
  const [deleting, setDeleting] = useState(false)

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
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user, ipoId])

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
        title: "Failed to update archive state",
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
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound || !ipo) {
    return (
      <div className="space-y-4">
        <Link
          href="/ipos"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to My IPOs
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 size-8 text-muted-foreground/50" />
            <h2 className="text-sm font-semibold text-foreground">
              IPO not found
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The requested IPO could not be found or may have been deleted.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              render={<Link href="/ipos" />}
            >
              Back to My IPOs
            </Button>
          </CardContent>
        </Card>
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

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/ipos"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to My IPOs
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setPriceDialogOpen(true)}
            className="text-xs"
          >
            <DollarSign className="mr-1.5 size-3 text-emerald-600 dark:text-emerald-400" />
            Market Prices
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setEditIpoOpen(true)}
            className="text-xs"
          >
            <Edit2 className="mr-1.5 size-3" />
            Edit IPO
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleToggleArchive}
            className="text-xs"
          >
            {ipo.archived ? (
              <>
                <ArchiveRestore className="mr-1.5 size-3" />
                Restore
              </>
            ) : (
              <>
                <Archive className="mr-1.5 size-3" />
                Archive
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="xs"
            onClick={() => setDeleteIpoOpen(true)}
            className="text-xs"
          >
            <Trash2 className="mr-1.5 size-3" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main IPO Header Card */}
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">
                  {ipo.name}
                </h1>
                <Badge
                  variant={ipo.type === "sme" ? "secondary" : "outline"}
                  className="text-xs uppercase"
                >
                  {ipo.type}
                </Badge>
                <Badge variant={statusInfo.variant} className="text-xs">
                  {statusInfo.label}
                </Badge>
                {ipo.archived && (
                  <Badge variant="outline" className="text-xs">
                    Archived
                  </Badge>
                )}
              </div>
              {ipo.companyName && (
                <p className="text-xs text-muted-foreground">
                  {ipo.companyName}
                </p>
              )}
            </div>

            {/* Price Highlights */}
            <div className="flex items-center gap-4 sm:text-right flex-wrap">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Issue Price
                </span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(ipo.issuePrice)}
                </span>
                <span className="text-xs text-muted-foreground block">
                  {ipo.lotSize} shares / lot
                </span>
              </div>

              {ipo.listingPrice && (
                <div className="border-l pl-4">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Listing Price
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(ipo.listingPrice)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {(((ipo.listingPrice - ipo.issuePrice) / ipo.issuePrice) * 100).toFixed(1)}% Gain
                  </span>
                </div>
              )}

              {ipo.currentPrice && (
                <div className="border-l pl-4">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Current (CMP)
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(ipo.currentPrice)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {(((ipo.currentPrice - ipo.issuePrice) / ipo.issuePrice) * 100).toFixed(1)}% vs Issue
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Quick specs grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">
                Lot Size
              </span>
              <span className="font-semibold text-foreground">
                {ipo.lotSize} shares
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px]">
                1 Lot Investment
              </span>
              <span className="font-semibold text-foreground">
                {formatCurrency(minAmount)}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px]">
                Price Band
              </span>
              <span className="font-semibold text-foreground">
                {ipo.priceBandMin && ipo.priceBandMax
                  ? `₹${ipo.priceBandMin} - ₹${ipo.priceBandMax}`
                  : "Fixed Price"}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px]">
                IPO Type
              </span>
              <span className="font-semibold text-foreground capitalize">
                {ipo.type === "mainboard" ? "Mainboard IPO" : "SME IPO"}
              </span>
            </div>
          </div>

          {/* Dates Row */}
          {(ipo.openDate ||
            ipo.closeDate ||
            ipo.allotmentDate ||
            ipo.listingDate) && (
            <div className="rounded-md bg-muted/40 p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" /> Open Date
                  </span>
                  <span className="font-medium text-foreground">
                    {formatDate(ipo.openDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" /> Close Date
                  </span>
                  <span className="font-medium text-foreground">
                    {formatDate(ipo.closeDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" /> Allotment Date
                  </span>
                  <span className="font-medium text-foreground">
                    {formatDate(ipo.allotmentDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" /> Listing Date
                  </span>
                  <span className="font-medium text-foreground">
                    {formatDate(ipo.listingDate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {ipo.notes && (
            <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-md border">
              <strong className="text-foreground">Notes: </strong>
              {ipo.notes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4-Metric Money State Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Applied */}
        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Total Applied
              </span>
              <Layers className="size-3.5 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(moneySummary.totalApplied)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {moneySummary.applicationsCount} Applications ({moneySummary.totalLotsApplied} Lots)
            </p>
          </CardContent>
        </Card>

        {/* Currently Blocked */}
        <Card className={moneySummary.blockedAmount > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Currently Blocked
              </span>
              <Lock className="size-3.5 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(moneySummary.blockedAmount)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {moneySummary.pendingCount} Pending Applications
            </p>
          </CardContent>
        </Card>

        {/* Invested */}
        <Card className={moneySummary.investedAmount > 0 ? "border-emerald-500/30 bg-emerald-500/5" : ""}>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Total Invested
              </span>
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(moneySummary.investedAmount)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {moneySummary.allottedCount + moneySummary.soldCount} Allotted ({moneySummary.totalAllottedShares} Shares)
            </p>
          </CardContent>
        </Card>

        {/* Expected Refund */}
        <Card>
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Expected Refund
              </span>
              <Banknote className="size-3.5 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(moneySummary.refundExpected)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {moneySummary.notAllottedCount} Not Allotted Applications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Summary Section (Shows whenever there are sales or unrealized gains) */}
      {profitSummary.hasAnyProfit && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
              Profit & Return Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md bg-card/60 p-3 border">
                <span className="text-[11px] text-muted-foreground block">
                  Your Net Profit (Realized)
                </span>
                <span
                  className={`text-lg font-bold ${
                    profitSummary.totalRealizedYourProfit > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : profitSummary.totalRealizedYourProfit < 0
                        ? "text-destructive"
                        : "text-foreground"
                  }`}
                >
                  {formatCurrency(profitSummary.totalRealizedYourProfit)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  After profit sharing deductions
                </span>
              </div>

              <div className="rounded-md bg-card/60 p-3 border">
                <span className="text-[11px] text-muted-foreground block">
                  Profit Shared (Others)
                </span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(profitSummary.totalRealizedProfitShared)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Distributed to Other Accounts
                </span>
              </div>

              <div className="rounded-md bg-card/60 p-3 border">
                <span className="text-[11px] text-muted-foreground block">
                  Total Gross Profit
                </span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(profitSummary.totalRealizedGrossProfit)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Total IPO realized profit
                </span>
              </div>

              <div className="rounded-md bg-card/60 p-3 border">
                <span className="text-[11px] text-muted-foreground block">
                  Unrealized Gain (CMP)
                </span>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(profitSummary.totalUnrealizedYourProfit)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  On unsold allotted shares
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications Section */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              Applications ({applications.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Manage accounts, allotments, and sales for this IPO
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {applications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
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
                <Download className="mr-1.5 size-3.5" />
                Export CSV
              </Button>
            )}
            {hasAllottedApps && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkSaleOpen(true)}
                className="text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10"
              >
                <TrendingUp className="mr-1.5 size-3.5" />
                Record Bulk Sale
              </Button>
            )}
            {applications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAllotmentOpen(true)}
              >
                <RefreshCw className="mr-1.5 size-3.5" />
                Update Allotment
              </Button>
            )}
            <Button size="sm" onClick={() => setBulkAddOpen(true)}>
              <Plus className="mr-1.5 size-3.5" />
              Add Applications
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Layers className="mb-2 size-8 text-muted-foreground/50" />
              <p className="text-xs font-medium text-foreground">
                No applications recorded yet
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Quickly select your application accounts, assign bank accounts,
                and record applications all at once.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setBulkAddOpen(true)}
              >
                <Plus className="mr-1.5 size-3.5" />
                Add Applications
              </Button>
            </div>
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

      {/* Edit IPO Dialog */}
      {user && (
        <IpoDialog
          open={editIpoOpen}
          onOpenChange={setEditIpoOpen}
          userId={user.uid}
          ipoToEdit={ipo}
          onSuccess={reloadData}
        />
      )}

      {/* Market Prices Dialog */}
      {user && (
        <IpoPriceDialog
          open={priceDialogOpen}
          onOpenChange={setPriceDialogOpen}
          userId={user.uid}
          ipo={ipo}
          onSuccess={reloadData}
        />
      )}

      {/* Bulk Add Applications Dialog */}
      {user && (
        <BulkApplicationDialog
          open={bulkAddOpen}
          onOpenChange={setBulkAddOpen}
          userId={user.uid}
          ipo={ipo}
          existingApplications={applications}
          accounts={accounts}
          bankAccounts={bankAccounts}
          onSuccess={reloadData}
        />
      )}

      {/* Bulk Allotment Update Dialog */}
      {user && (
        <BulkAllotmentDialog
          open={allotmentOpen}
          onOpenChange={setAllotmentOpen}
          userId={user.uid}
          ipo={ipo}
          applications={applications}
          accounts={accounts}
          bankAccounts={bankAccounts}
          onSuccess={reloadData}
        />
      )}

      {/* Bulk Sale Dialog */}
      {user && (
        <BulkSaleDialog
          open={bulkSaleOpen}
          onOpenChange={setBulkSaleOpen}
          userId={user.uid}
          ipo={ipo}
          applications={applications}
          accounts={accounts}
          onSuccess={reloadData}
        />
      )}

      {/* Single Record Sale Dialog */}
      {user && (
        <RecordSaleDialog
          open={Boolean(appToSell)}
          onOpenChange={(open) => !open && setAppToSell(null)}
          userId={user.uid}
          ipo={ipo}
          application={appToSell}
          account={accounts.find((a) => a.id === appToSell?.accountId)}
          onSuccess={reloadData}
        />
      )}

      {/* Edit Single Application Dialog */}
      {user && (
        <EditApplicationDialog
          open={Boolean(appToEdit)}
          onOpenChange={(open) => !open && setAppToEdit(null)}
          userId={user.uid}
          ipo={ipo}
          application={appToEdit}
          account={accounts.find((a) => a.id === appToEdit?.accountId)}
          bankAccounts={bankAccounts}
          onSuccess={reloadData}
        />
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={deleteIpoOpen}
        onOpenChange={setDeleteIpoOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete IPO?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{ipo.name}</strong>? All linked application records will
              be removed.
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
    </div>
  )
}
