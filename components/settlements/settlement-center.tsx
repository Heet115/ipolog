"use client"

import Link from "next/link"
import { HandCoins, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { SettlementMetricsStrip } from "@/components/settlements/settlement-metrics-strip"
import { SettlementControlsBar } from "@/components/settlements/settlement-controls-bar"
import { SettlementPartnerCard } from "@/components/settlements/settlement-partner-card"
import { MultiIpoSettlementDialog } from "@/components/settlements/multi-ipo-settlement-dialog"
import { useSettlementCenter } from "@/hooks/use-settlement-center"
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

export function SettlementCenter({
  applications,
  ipos,
  accounts,
  bankAccounts,
  userId,
  userName = "Me",
  onRefresh,
}: SettlementCenterProps) {
  const {
    statusTab,
    setStatusTab,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    expandedAccounts,
    updatingId,
    summary,
    totalPartnerProfit,
    partnerAccountsList,
    filteredPartners,
    pendingPartnersCount,
    settledPartnersCount,
    toggleExpand,
    handleToggleSingleSettlement,
    handleSettleAllForAccount,
    handleRevertAllForAccount,
    handleOpenDialog,
    selectedPartnerEntry,
    dialogItems,
  } = useSettlementCenter({
    applications,
    ipos,
    accounts,
    userId,
    onRefresh,
  })

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Metrics Strip */}
      <SettlementMetricsStrip
        summary={summary}
        totalPartnerProfit={totalPartnerProfit}
        partnerAccountsCount={partnerAccountsList.length}
        pendingPartnersCount={pendingPartnersCount}
        settledPartnersCount={settledPartnersCount}
      />

      {/* 2. Controls Bar: Status Tabs & Utility Toolbar */}
      <SettlementControlsBar
        statusTab={statusTab}
        setStatusTab={setStatusTab}
        search={search}
        setSearch={setSearch}
        totalPartnersCount={partnerAccountsList.length}
        pendingPartnersCount={pendingPartnersCount}
        settledPartnersCount={settledPartnersCount}
        filteredCount={filteredPartners.length}
      />

      {/* 3. Main Content: Partner Settlement Cards */}
      {partnerAccountsList.length === 0 ? (
        <Empty className="border border-border/70">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HandCoins className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No partner settlements yet</EmptyTitle>
            <EmptyDescription>
              Settlement ledgers appear automatically when applications
              belonging to Partner Accounts are marked as sold with realized
              profit or loss.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/applications" />}
            >
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
          {filteredPartners.map((entry) => (
            <SettlementPartnerCard
              key={entry.account.id}
              entry={entry}
              isExpanded={Boolean(expandedAccounts[entry.account.id])}
              isActionLoading={updatingId === `all-${entry.account.id}`}
              updatingId={updatingId}
              onToggleExpand={toggleExpand}
              onOpenWhatsAppDialog={handleOpenDialog}
              onSettleAll={handleSettleAllForAccount}
              onRevertAll={handleRevertAllForAccount}
              onToggleSingleSettlement={handleToggleSingleSettlement}
            />
          ))}
        </div>
      )}

      {/* 4. Multi-IPO WhatsApp Dialog */}
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
