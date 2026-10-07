"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  HandCoins,
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { toast } from "@/components/ui/toast"
import {
  updateApplicationSettlement,
  updateSettlementsBatch,
} from "@/lib/firebase/applications"
import {
  calculateReceivablesSummary,
  type AccountReceivableItem,
} from "@/lib/calculations/financials"
import { MultiIpoSettlementDialog } from "@/components/settlements/multi-ipo-settlement-dialog"
import { formatCurrency } from "@/lib/utils/ipo"
import { cn } from "@/lib/utils"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

interface SettlementCenterProps {
  applications: Application[]
  ipos: Ipo[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  userId: string
  userName?: string
  onRefresh: () => void
}

type SettlementFilterTab = "all" | "pending" | "settled"

export function SettlementCenter({
  applications,
  ipos,
  accounts,
  bankAccounts,
  userId,
  userName = "Me",
  onRefresh,
}: SettlementCenterProps) {
  const [statusTab, setStatusTab] = useState<SettlementFilterTab>("all")
  const [search, setSearch] = useState("")
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Map Lookups
  const ipoMap = useMemo(() => {
    const map = new Map<string, Ipo>()
    for (const ipo of ipos) map.set(ipo.id, ipo)
    return map
  }, [ipos])

  const accountMap = useMemo(() => {
    const map = new Map<string, ApplicationAccount>()
    for (const acc of accounts) map.set(acc.id, acc)
    return map
  }, [accounts])

  // Receivables summary
  const summary = useMemo(() => {
    return calculateReceivablesSummary(applications, ipoMap, accountMap)
  }, [applications, ipoMap, accountMap])

  // Total Partner Profit Distributed
  const totalPartnerProfit = useMemo(() => {
    let sum = 0
    for (const item of summary.items) {
      sum += item.ownerProfitShare || 0
    }
    return sum
  }, [summary.items])

  // Convert byAccount Map into sorted array
  const partnerAccountsList = useMemo(() => {
    const list = Array.from(summary.byAccount.values())
    list.sort((a, b) => {
      // Pending first, then by pending amount descending
      if (a.unsettledCount > 0 && b.unsettledCount === 0) return -1
      if (a.unsettledCount === 0 && b.unsettledCount > 0) return 1
      return b.pendingAmount - a.pendingAmount
    })
    return list
  }, [summary.byAccount])

  // Filter partners based on tab and search
  const filteredPartners = useMemo(() => {
    return partnerAccountsList.filter((entry) => {
      // Tab filter
      if (statusTab === "pending" && entry.unsettledCount === 0) return false
      if (statusTab === "settled" && entry.unsettledCount > 0) return false

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = entry.account.name.toLowerCase().includes(q)
        const matchPhone = entry.account.phoneNumber?.toLowerCase().includes(q)
        const matchPan = entry.account.pan?.toLowerCase().includes(q)
        const matchIpo = entry.applications.some((app) =>
          app.ipoName.toLowerCase().includes(q)
        )
        if (!matchName && !matchPhone && !matchPan && !matchIpo) return false
      }

      return true
    })
  }, [partnerAccountsList, statusTab, search])

  // Toggle account expansion
  const toggleExpand = (accountId: string) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }))
  }

  // Handle single settlement toggle
  const handleToggleSingleSettlement = async (item: AccountReceivableItem) => {
    const nextStatus = item.settlementStatus === "settled" ? "pending" : "settled"
    setUpdatingId(item.applicationId)
    try {
      await updateApplicationSettlement(userId, item.applicationId, nextStatus)
      toast.add({
        title: nextStatus === "settled" ? "Marked as settled" : "Reverted to pending",
        type: "success",
      })
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to update settlement status",
        type: "error",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle batch settle for all pending applications of an account
  const handleSettleAllForAccount = async (
    accountId: string,
    applicationItems: AccountReceivableItem[]
  ) => {
    const pendingIds = applicationItems
      .filter((i) => i.settlementStatus !== "settled")
      .map((i) => i.applicationId)

    if (pendingIds.length === 0) return

    setUpdatingId(`all-${accountId}`)
    try {
      await updateSettlementsBatch(userId, pendingIds, "settled")
      toast.add({
        title: `Settled ${pendingIds.length} application(s)`,
        type: "success",
      })
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to batch settle applications",
        type: "error",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle batch revert for all settled applications of an account
  const handleRevertAllForAccount = async (
    accountId: string,
    applicationItems: AccountReceivableItem[]
  ) => {
    const settledIds = applicationItems
      .filter((i) => i.settlementStatus === "settled")
      .map((i) => i.applicationId)

    if (settledIds.length === 0) return

    setUpdatingId(`all-${accountId}`)
    try {
      await updateSettlementsBatch(userId, settledIds, "pending")
      toast.add({
        title: `Reverted ${settledIds.length} application(s) to pending`,
        type: "success",
      })
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to revert applications",
        type: "error",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Open WhatsApp dialog for a partner
  const handleOpenDialog = (accountId: string) => {
    setSelectedPartnerId(accountId)
    setDialogOpen(true)
  }

  const selectedPartnerEntry = useMemo(() => {
    if (!selectedPartnerId) return null
    return summary.byAccount.get(selectedPartnerId) || null
  }, [summary.byAccount, selectedPartnerId])

  // Multi-IPO items formatted for dialog
  const dialogItems = useMemo(() => {
    if (!selectedPartnerEntry) return []
    return selectedPartnerEntry.applications.map((item) => ({
      applicationId: item.applicationId,
      ipoName: item.ipoName,
      allottedShares: item.allottedShares || 0,
      allottedLots: item.allottedLots || 1,
      issuePrice: item.issuePrice || 0,
      investedAmount: item.investedAmount,
      salePrice: item.salePrice || 0,
      saleProceeds: item.saleProceeds,
      grossProfit: item.grossProfit,
      ownerProfitShare: item.ownerProfitShare,
      yourProfitShare: item.yourProfitShare,
      amountToSendUser: item.amountToSendUser,
      settlementStatus: item.settlementStatus,
    }))
  }, [selectedPartnerEntry])


  const pendingPartnersCount = partnerAccountsList.filter((p) => p.unsettledCount > 0).length
  const settledPartnersCount = partnerAccountsList.filter((p) => p.unsettledCount === 0 && p.settledCount > 0).length

  return (
    <div className="flex flex-col gap-6">
      {/* Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Pending Receivables */}
        <div className="flex flex-col justify-between gap-2 border border-border/70 bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Receivables
            </span>
            <div className="flex size-6 items-center justify-center rounded-none bg-warning/15 text-warning-foreground">
              <Clock className="size-3.5" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xl font-bold text-warning-foreground">
              {formatCurrency(summary.totalPendingReceivables)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {summary.pendingCount} allotment{summary.pendingCount === 1 ? "" : "s"} across{" "}
              {summary.pendingAccountsCount} partner{summary.pendingAccountsCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Settled Capital */}
        <div className="flex flex-col justify-between gap-2 border border-border/70 bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Settled Capital
            </span>
            <div className="flex size-6 items-center justify-center rounded-none bg-success/15 text-success">
              <CheckCircle2 className="size-3.5" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xl font-bold text-success">
              {formatCurrency(summary.totalSettledReceivables)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {summary.settledCount} allotment{summary.settledCount === 1 ? "" : "s"} realized & settled
            </span>
          </div>
        </div>

        {/* Partner Profit Retained */}
        <div className="flex flex-col justify-between gap-2 border border-border/70 bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Partner Profit Kept
            </span>
            <div className="flex size-6 items-center justify-center rounded-none bg-primary/15 text-primary">
              <TrendingUp className="size-3.5" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xl font-bold text-foreground">
              {formatCurrency(totalPartnerProfit)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Distributed to partner accounts
            </span>
          </div>
        </div>

        {/* Active Partner Accounts */}
        <div className="flex flex-col justify-between gap-2 border border-border/70 bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Partner Accounts
            </span>
            <div className="flex size-6 items-center justify-center rounded-none bg-muted text-muted-foreground">
              <Users className="size-3.5" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xl font-bold text-foreground">
              {partnerAccountsList.length}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {pendingPartnersCount} pending • {settledPartnersCount} settled
            </span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Status Tabs & Utility Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Tier 1: Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border/80 pb-2">
          <button
            type="button"
            onClick={() => setStatusTab("all")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
              statusTab === "all"
                ? "bg-foreground text-background font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span>All Partners</span>
            <span
              className={cn(
                "px-1.5 py-0.2 font-mono text-[10px]",
                statusTab === "all"
                  ? "bg-background/25 text-background font-bold"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {partnerAccountsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab("pending")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
              statusTab === "pending"
                ? "bg-foreground text-background font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "size-1.5 shrink-0",
                pendingPartnersCount > 0 ? "bg-amber-500 animate-pulse" : "bg-muted-foreground"
              )}
            />
            <span>Needs Settlement</span>
            <span
              className={cn(
                "px-1.5 py-0.2 font-mono text-[10px]",
                statusTab === "pending"
                  ? "bg-background/25 text-background font-bold"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {pendingPartnersCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab("settled")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
              statusTab === "settled"
                ? "bg-foreground text-background font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span>Fully Settled</span>
            <span
              className={cn(
                "px-1.5 py-0.2 font-mono text-[10px]",
                statusTab === "settled"
                  ? "bg-background/25 text-background font-bold"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {settledPartnersCount}
            </span>
          </button>
        </div>

        {/* Tier 2: Search Input & Controls */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="w-full sm:w-72 md:w-80">
              <InputGroup className="h-8">
                <InputGroupAddon align="inline-start">
                  <Search className="size-3.5 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Search partner, phone, PAN, IPO..."
                  aria-label="Search partner settlements"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="text-xs"
                />
                {search && (
                  <InputGroupAddon align="inline-end">
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="size-3" />
                    </button>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </div>

            {(search || statusTab !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setStatusTab("all")
                }}
                className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
                <span>Reset</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-muted-foreground">
              Showing {filteredPartners.length} partner{filteredPartners.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Partner Settlement Cards */}
      {partnerAccountsList.length === 0 ? (
        <Empty className="border border-border/70">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HandCoins className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No partner settlements yet</EmptyTitle>
            <EmptyDescription>
              Settlement ledgers appear automatically when applications belonging to Partner
              Accounts are marked as sold with realized profit or loss.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" render={<Link href="/applications" />}>
              View Applications Ledger
            </Button>
          </EmptyContent>
        </Empty>
      ) : filteredPartners.length === 0 ? (
        <Empty className="border border-border/70">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No settlements match your criteria</EmptyTitle>
            <EmptyDescription>
              Try clearing your search term or switching the status tab above.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("")
                setStatusTab("all")
              }}
            >
              Clear Filters
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredPartners.map((entry) => {
            const { account, pendingAmount, settledAmount, unsettledCount, applications: appItems } = entry
            const isExpanded = Boolean(expandedAccounts[account.id])
            const isFullySettled = unsettledCount === 0
            const isActionLoading = updatingId === `all-${account.id}`

            const initials = account.name
              .split(" ")
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase() || "PA"

            return (
              <Card
                key={account.id}
                className={cn(
                  "relative flex flex-col rounded-none border transition-all shadow-xs",
                  isFullySettled
                    ? "border-border/60 bg-card/60"
                    : "border-warning/40 bg-card hover:border-warning/70"
                )}
              >
                <CardContent className="flex flex-col gap-4 p-4.5">
                  {/* Top Bar: Partner Details & Headline Amounts */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-9 rounded-none border border-border">
                        <AvatarFallback className="rounded-none bg-primary/10 text-xs font-bold text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-heading text-sm font-bold text-foreground">
                            {account.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="rounded-none px-1.5 py-0 font-mono text-[9px] uppercase"
                          >
                            Partner
                          </Badge>
                          {account.profitSharePercent ? (
                            <Badge
                              variant="outline"
                              className="rounded-none px-1.5 py-0 font-mono text-[9px]"
                            >
                              {account.profitSharePercent}% Share
                            </Badge>
                          ) : null}
                          {isFullySettled ? (
                            <Badge
                              variant="success"
                              className="rounded-none px-1.5 py-0 text-[10px]"
                            >
                              Fully Settled ✓
                            </Badge>
                          ) : (
                            <Badge
                              variant="warning"
                              className="rounded-none px-1.5 py-0 text-[10px]"
                            >
                              {unsettledCount} IPO{unsettledCount === 1 ? "" : "s"} Pending
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {account.phoneNumber && (
                            <div className="flex items-center gap-1">
                              <Phone className="size-3" />
                              <span>{account.phoneNumber}</span>
                            </div>
                          )}
                          {account.pan && (
                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              <span>PAN:</span>
                              <span className="text-foreground">{account.pan}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span>Total Allotments:</span>
                            <span className="font-mono font-semibold text-foreground">
                              {appItems.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Headline Amounts & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                      <div className="flex flex-col items-start sm:items-end">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {isFullySettled ? "Total Settled" : "Amount to Transfer"}
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={cn(
                              "font-mono text-lg font-bold sm:text-xl",
                              isFullySettled ? "text-success" : "text-warning-foreground"
                            )}
                          >
                            {formatCurrency(isFullySettled ? settledAmount : pendingAmount)}
                          </span>
                          {!isFullySettled && settledAmount > 0 && (
                            <span className="text-[11px] text-muted-foreground">
                              ({formatCurrency(settledAmount)} settled)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* WhatsApp Statement Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(account.id)}
                          className="h-8 gap-1.5 rounded-none text-xs font-medium"
                          title="Generate WhatsApp statement"
                        >
                          <MessageSquare className="size-3.5 text-success" />
                          <span>WhatsApp</span>
                        </Button>

                        {/* Settle All / Revert Button */}
                        {!isFullySettled ? (
                          <Button
                            size="sm"
                            onClick={() => handleSettleAllForAccount(account.id, appItems)}
                            disabled={isActionLoading}
                            className="h-8 gap-1.5 rounded-none text-xs"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>{isActionLoading ? "Settling..." : `Settle All (${unsettledCount})`}</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevertAllForAccount(account.id, appItems)}
                            disabled={isActionLoading}
                            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <RotateCcw className="size-3" />
                            <span>Revert All</span>
                          </Button>
                        )}

                        {/* Expand / Collapse Button */}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => toggleExpand(account.id)}
                          className="size-8 text-muted-foreground hover:text-foreground"
                          title={isExpanded ? "Collapse allotments" : "View allotments"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Itemized Allotments Table */}
                  {isExpanded && (
                    <div className="mt-2 flex flex-col gap-2 border-t border-border/70 pt-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span>Allotment Breakdown ({appItems.length} IPOs)</span>
                      </div>

                      <div className="overflow-x-auto border border-border/70">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-border/70 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase">
                            <tr>
                              <th className="p-2.5">IPO</th>
                              <th className="p-2.5 text-right">Shares</th>
                              <th className="p-2.5 text-right">Applied</th>
                              <th className="p-2.5 text-right">Proceeds</th>
                              <th className="p-2.5 text-right">Gross P&L</th>
                              <th className="p-2.5 text-right">Partner Share</th>
                              <th className="p-2.5 text-right">Transfer</th>
                              <th className="p-2.5 text-center">Status</th>
                              <th className="p-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                            {appItems.map((item) => {
                              const isItemSettled = item.settlementStatus === "settled"
                              const isSingleUpdating = updatingId === item.applicationId
                              const isGrossPos = item.grossProfit >= 0

                              return (
                                <tr
                                  key={item.applicationId}
                                  className={cn(
                                    "transition-colors hover:bg-muted/30",
                                    isItemSettled && "bg-muted/10"
                                  )}
                                >
                                  <td className="p-2.5 font-sans font-bold text-foreground">
                                    <Link
                                      href={`/ipos/${item.ipoId}`}
                                      className="hover:underline flex items-center gap-1 text-xs"
                                    >
                                      <span>{item.ipoName}</span>
                                      <ExternalLink className="size-2.5 text-muted-foreground" />
                                    </Link>
                                  </td>
                                  <td className="p-2.5 text-right text-muted-foreground">
                                    {item.allottedShares} ({item.allottedLots}L)
                                  </td>
                                  <td className="p-2.5 text-right text-muted-foreground">
                                    {formatCurrency(item.investedAmount)}
                                  </td>
                                  <td className="p-2.5 text-right text-foreground">
                                    {formatCurrency(item.saleProceeds)}
                                  </td>
                                  <td
                                    className={cn(
                                      "p-2.5 text-right font-bold",
                                      isGrossPos ? "text-success" : "text-destructive"
                                    )}
                                  >
                                    {isGrossPos ? "+" : ""}
                                    {formatCurrency(item.grossProfit)}
                                  </td>
                                  <td className="p-2.5 text-right text-muted-foreground">
                                    {item.ownerProfitShare > 0
                                      ? formatCurrency(item.ownerProfitShare)
                                      : "—"}
                                  </td>
                                  <td className="p-2.5 text-right font-bold text-foreground">
                                    {formatCurrency(item.amountToSendUser)}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <Badge
                                      variant={isItemSettled ? "success" : "warning"}
                                      className="px-1.5 py-0 text-[9px] uppercase"
                                    >
                                      {isItemSettled ? "Settled" : "Pending"}
                                    </Badge>
                                  </td>
                                  <td className="p-2.5 text-right">
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      onClick={() => handleToggleSingleSettlement(item)}
                                      disabled={isSingleUpdating}
                                      className={cn(
                                        "h-6 px-2 text-[10px]",
                                        isItemSettled
                                          ? "text-muted-foreground hover:text-foreground"
                                          : "text-primary hover:text-primary/80 font-semibold"
                                      )}
                                    >
                                      {isSingleUpdating
                                        ? "..."
                                        : isItemSettled
                                          ? "Revert"
                                          : "Mark Settled"}
                                    </Button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Multi-IPO WhatsApp Dialog */}
      {selectedPartnerEntry && (
        <MultiIpoSettlementDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          account={selectedPartnerEntry.account}
          items={dialogItems}
          bankAccounts={bankAccounts}
          userId={userId}
          defaultSenderName={userName}
          onSettled={onRefresh}
        />
      )}
    </div>
  )
}
