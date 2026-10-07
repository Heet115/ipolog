"use client"

import { Layers } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useBulkApplication } from "@/hooks/use-bulk-application"
import { BulkApplicationStepAccounts } from "@/components/applications/bulk-application-step-accounts"
import { BulkApplicationStepConfig } from "@/components/applications/bulk-application-step-config"
import { BulkApplicationPanModal } from "@/components/applications/bulk-application-pan-modal"
import type {
  Ipo,
  ApplicationAccount,
  BankAccount,
  Application,
} from "@/types"

interface BulkApplicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  existingApplications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onSuccess: () => void
}

export function BulkApplicationDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  existingApplications,
  accounts,
  bankAccounts,
  onSuccess,
}: BulkApplicationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <BulkApplicationForm
          key={ipo.id}
          userId={userId}
          ipo={ipo}
          existingApplications={existingApplications}
          accounts={accounts}
          bankAccounts={bankAccounts}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => {
            onOpenChange(false)
            onSuccess()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function BulkApplicationForm({
  userId,
  ipo,
  existingApplications,
  accounts,
  bankAccounts,
  onCancel,
  onSuccess,
}: {
  userId: string
  ipo: Ipo
  existingApplications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onCancel: () => void
  onSuccess: () => void
}) {
  const {
    step,
    setStep,
    selectedAccountIds,
    defaultCategory,
    defaultBankId,
    defaultLots,
    accountConfigs,
    sortColumn,
    sortDirection,
    toggleSort,
    loading,
    error,
    hideAppliedAccounts,
    setHideAppliedAccounts,
    showDuplicatePanConfirm,
    setShowDuplicatePanConfirm,
    appliedAccountIds,
    activeAccounts,
    myAccounts,
    otherAccounts,
    activeBankAccounts,
    accountMap,
    bankAsbaBreaches,
    intraBatchDuplicatePans,
    selectedPanConflictsWithApplied,
    problematicAccountIds,
    hasDuplicatePanIssues,
    allAccountsAlreadyApplied,
    getPanAppliedWarning,
    toggleAccountSelection,
    selectAllMy,
    selectAllOther,
    selectAllAvailable,
    deselectAll,
    applyGlobalCategory,
    applyGlobalBank,
    applyGlobalLots,
    updateIndividualBank,
    updateIndividualCategory,
    updateIndividualLots,
    handleProceedToStep2,
    handleSubmit,
    executeSubmission,
    totalLots,
    totalAmount,
    sortedSelectedAccountIds,
    minShniLots,
    minBhniLots,
    oneLotAmount,
  } = useBulkApplication({
    userId,
    ipo,
    existingApplications,
    accounts,
    bankAccounts,
    onSuccess,
  })

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader className="border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
              <Layers className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Record Applications — {ipo.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {step === 1
                  ? "Select investor accounts, bidding category, and funding banks"
                  : "Review application lots, verify ASBA limits, and submit"}
              </DialogDescription>
            </div>
          </div>
          <Badge variant="outline" className="rounded-none font-mono text-xs">
            Step {step} of 2
          </Badge>
        </div>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* STEP 1: Account Selection */}
      {step === 1 && (
        <BulkApplicationStepAccounts
          activeAccounts={activeAccounts}
          myAccounts={myAccounts}
          otherAccounts={otherAccounts}
          selectedAccountIds={selectedAccountIds}
          appliedAccountIds={appliedAccountIds}
          allAccountsAlreadyApplied={allAccountsAlreadyApplied}
          hideAppliedAccounts={hideAppliedAccounts}
          onToggleHideAppliedAccounts={() =>
            setHideAppliedAccounts(!hideAppliedAccounts)
          }
          hasDuplicatePanIssues={hasDuplicatePanIssues}
          intraBatchDuplicatePans={intraBatchDuplicatePans}
          selectedPanConflictsWithApplied={selectedPanConflictsWithApplied}
          problematicAccountIds={problematicAccountIds}
          defaultCategory={defaultCategory}
          onApplyGlobalCategory={applyGlobalCategory}
          defaultLots={defaultLots}
          oneLotAmount={oneLotAmount}
          getPanAppliedWarning={getPanAppliedWarning}
          onToggleAccountSelection={toggleAccountSelection}
          onSelectAllMy={selectAllMy}
          onSelectAllOther={selectAllOther}
          onSelectAllAvailable={selectAllAvailable}
          onDeselectAll={deselectAll}
          onCancel={onCancel}
          onProceedToStep2={handleProceedToStep2}
        />
      )}

      {/* STEP 2: Configure & Review */}
      {step === 2 && (
        <BulkApplicationStepConfig
          ipo={ipo}
          selectedAccountIds={selectedAccountIds}
          sortedSelectedAccountIds={sortedSelectedAccountIds}
          accountMap={accountMap}
          activeBankAccounts={activeBankAccounts}
          accountConfigs={accountConfigs}
          defaultCategory={defaultCategory}
          onApplyGlobalCategory={applyGlobalCategory}
          defaultBankId={defaultBankId}
          onApplyGlobalBank={applyGlobalBank}
          defaultLots={defaultLots}
          onApplyGlobalLots={applyGlobalLots}
          minShniLots={minShniLots}
          minBhniLots={minBhniLots}
          oneLotAmount={oneLotAmount}
          bankAsbaBreaches={bankAsbaBreaches}
          hasDuplicatePanIssues={hasDuplicatePanIssues}
          intraBatchDuplicatePans={intraBatchDuplicatePans}
          selectedPanConflictsWithApplied={selectedPanConflictsWithApplied}
          problematicAccountIds={problematicAccountIds}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onToggleSort={toggleSort}
          onUpdateIndividualBank={updateIndividualBank}
          onUpdateIndividualCategory={updateIndividualCategory}
          onUpdateIndividualLots={updateIndividualLots}
          totalLots={totalLots}
          totalAmount={totalAmount}
          loading={loading}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
        />
      )}

      {/* Duplicate PAN Submission Confirmation Modal */}
      <BulkApplicationPanModal
        open={showDuplicatePanConfirm}
        onOpenChange={setShowDuplicatePanConfirm}
        loading={loading}
        intraBatchDuplicatePans={intraBatchDuplicatePans}
        selectedPanConflictsWithApplied={selectedPanConflictsWithApplied}
        onCancel={() => setShowDuplicatePanConfirm(false)}
        onConfirm={executeSubmission}
      />
    </div>
  )
}
