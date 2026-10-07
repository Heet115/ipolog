"use client"

import { ArrowRight, Eye, EyeOff, AlertTriangle, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DialogFooter } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils/ipo"
import { cn } from "@/lib/utils"
import { CATEGORY_CONFIG, ALL_CATEGORIES } from "@/lib/calculations/categories"
import type { ApplicationAccount, ApplicationCategory } from "@/types"

interface BulkApplicationStepAccountsProps {
  activeAccounts: ApplicationAccount[]
  myAccounts: ApplicationAccount[]
  otherAccounts: ApplicationAccount[]
  selectedAccountIds: string[]
  appliedAccountIds: Set<string>
  allAccountsAlreadyApplied: boolean
  hideAppliedAccounts: boolean
  onToggleHideAppliedAccounts: () => void
  hasDuplicatePanIssues: boolean
  intraBatchDuplicatePans: Array<{
    pan: string
    accounts: ApplicationAccount[]
  }>
  selectedPanConflictsWithApplied: Array<{
    selectedAccount: ApplicationAccount
    appliedAccount: ApplicationAccount
    pan: string
  }>
  problematicAccountIds: Set<string>
  defaultCategory: ApplicationCategory
  onApplyGlobalCategory: (cat: ApplicationCategory) => void
  defaultLots: number
  oneLotAmount: number
  getPanAppliedWarning: (account: ApplicationAccount) => {
    pan: string
    appliedAccountName: string
  } | null
  onToggleAccountSelection: (accountId: string) => void
  onSelectAllMy: () => void
  onSelectAllOther: () => void
  onSelectAllAvailable: () => void
  onDeselectAll: () => void
  onCancel: () => void
  onProceedToStep2: () => void
}

export function BulkApplicationStepAccounts({
  activeAccounts,
  myAccounts,
  otherAccounts,
  selectedAccountIds,
  appliedAccountIds,
  allAccountsAlreadyApplied,
  hideAppliedAccounts,
  onToggleHideAppliedAccounts,
  hasDuplicatePanIssues,
  intraBatchDuplicatePans,
  selectedPanConflictsWithApplied,
  problematicAccountIds,
  defaultCategory,
  onApplyGlobalCategory,
  defaultLots,
  oneLotAmount,
  getPanAppliedWarning,
  onToggleAccountSelection,
  onSelectAllMy,
  onSelectAllOther,
  onSelectAllAvailable,
  onDeselectAll,
  onCancel,
  onProceedToStep2,
}: BulkApplicationStepAccountsProps) {
  if (activeAccounts.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        You haven&apos;t created any application accounts yet. Please add
        accounts from the Application Accounts page first.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* All Accounts Already Applied Notice */}
      {allAccountsAlreadyApplied && (
        <Alert className="rounded-none border-primary/50 bg-primary/5 text-xs">
          <Info className="size-4 text-primary" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>
              <strong>All Accounts Applied:</strong> Every active account in
              your portfolio already has an application recorded for this IPO.
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onCancel}
              className="rounded-none text-xs"
            >
              Close
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Applied Accounts Status Bar */}
      {appliedAccountIds.size > 0 && !allAccountsAlreadyApplied && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-border/70 bg-muted/20 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-semibold text-foreground">
              {appliedAccountIds.size} of {activeAccounts.length}
            </span>
            <span>accounts have already applied for this IPO</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onToggleHideAppliedAccounts}
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {hideAppliedAccounts ? (
              <>
                <Eye className="size-3" />
                <span>Show applied ({appliedAccountIds.size})</span>
              </>
            ) : (
              <>
                <EyeOff className="size-3" />
                <span>Hide applied ({appliedAccountIds.size})</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Duplicate PAN Warning Alert */}
      {hasDuplicatePanIssues && (
        <Alert className="rounded-none border-amber-500/50 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="flex flex-col gap-1">
            <span className="font-bold">
              Duplicate PAN Detected — Potential Exchange Disqualification:
            </span>
            <div className="flex flex-col gap-0.5 text-[11px] leading-relaxed">
              {intraBatchDuplicatePans.map((d) => (
                <span key={d.pan}>
                  • Accounts{" "}
                  <strong>{d.accounts.map((a) => a.name).join(" & ")}</strong>{" "}
                  share PAN <span className="font-mono font-bold">{d.pan}</span>
                  .
                </span>
              ))}
              {selectedPanConflictsWithApplied.map((c) => (
                <span key={c.selectedAccount.id}>
                  • Account <strong>{c.selectedAccount.name}</strong> shares PAN{" "}
                  <span className="font-mono font-bold">{c.pan}</span> with
                  already-applied <strong>{c.appliedAccount.name}</strong>.
                </span>
              ))}
            </div>
            <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80">
              In Indian IPOs, registrars automatically reject duplicate
              applications submitted with identical PAN numbers for the same
              IPO.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Category & Quick Actions Bar */}
      <div className="flex flex-col gap-2 rounded-none border bg-muted/30 p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <span>Default Quota:</span>
            <Select
              value={defaultCategory}
              onValueChange={(val) =>
                val && onApplyGlobalCategory(val as ApplicationCategory)
              }
            >
              <SelectTrigger className="h-7 w-40 bg-background text-xs">
                <SelectValue>
                  {CATEGORY_CONFIG[defaultCategory].label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ALL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex w-full items-center justify-between gap-2">
                      <span>{CATEGORY_CONFIG[cat].label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({CATEGORY_CONFIG[cat].amountLimitText})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {defaultLots} lot{defaultLots > 1 ? "s" : ""} •{" "}
            {formatCurrency(defaultLots * oneLotAmount)} / app
          </span>
        </div>
      </div>

      {/* Selection Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2 text-xs">
        <span className="font-semibold text-foreground">
          Selected: {selectedAccountIds.length} of {activeAccounts.length}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onSelectAllMy}
          >
            All My
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onSelectAllOther}
          >
            All Other
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onSelectAllAvailable}
          >
            Select All
          </Button>
          {selectedAccountIds.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onDeselectAll}
              className="text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* My Accounts */}
      {myAccounts.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            My Accounts (
            {hideAppliedAccounts
              ? `${myAccounts.filter((a) => !appliedAccountIds.has(a.id)).length} of ${myAccounts.length}`
              : myAccounts.length}
            )
          </span>
          {myAccounts.filter((a) => !appliedAccountIds.has(a.id)).length ===
            0 && hideAppliedAccounts ? (
            <div className="py-2 text-[11px] text-muted-foreground italic">
              All {myAccounts.length} self accounts have already applied for
              this IPO.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(hideAppliedAccounts
                ? myAccounts.filter((a) => !appliedAccountIds.has(a.id))
                : myAccounts
              ).map((account) => {
                const alreadyApplied = appliedAccountIds.has(account.id)
                const isSelected = selectedAccountIds.includes(account.id)
                const panWarning = !alreadyApplied
                  ? getPanAppliedWarning(account)
                  : null
                const isDuplicatePanSelected =
                  isSelected && problematicAccountIds.has(account.id)

                return (
                  <label
                    key={account.id}
                    className={cn(
                      "flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-none border p-2.5 text-xs transition-all",
                      alreadyApplied &&
                        "cursor-not-allowed border-dashed bg-muted/20 opacity-50",
                      !alreadyApplied &&
                        isDuplicatePanSelected &&
                        "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500",
                      !alreadyApplied &&
                        !isDuplicatePanSelected &&
                        isSelected &&
                        "border-primary bg-primary/5 ring-1 ring-primary",
                      !alreadyApplied &&
                        !isSelected &&
                        panWarning &&
                        "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/70",
                      !alreadyApplied &&
                        !isSelected &&
                        !panWarning &&
                        "border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Checkbox
                        checked={isSelected}
                        disabled={alreadyApplied}
                        onCheckedChange={() =>
                          !alreadyApplied &&
                          onToggleAccountSelection(account.id)
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="block truncate text-xs font-semibold text-foreground"
                            title={account.name}
                          >
                            {account.name}
                          </span>
                          {account.sortIndex !== undefined && (
                            <span className="font-mono text-[9px] text-muted-foreground">
                              #{account.sortIndex + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="block truncate text-[10px] text-muted-foreground">
                            Self Account
                          </span>
                          {account.pan && (
                            <span className="font-mono text-[9px] text-muted-foreground/80">
                              • PAN: {account.pan}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {alreadyApplied && (
                      <Badge
                        variant="outline"
                        className="shrink-0 py-0 font-mono text-[10px]"
                      >
                        Applied
                      </Badge>
                    )}
                    {!alreadyApplied && isDuplicatePanSelected && (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 border-amber-500/60 bg-amber-500/10 font-mono text-[9px] text-amber-600 dark:text-amber-400"
                      >
                        <AlertTriangle className="size-2.5" />
                        <span>Dup PAN</span>
                      </Badge>
                    )}
                    {!alreadyApplied &&
                      !isDuplicatePanSelected &&
                      panWarning && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-amber-500/40 bg-amber-500/10 font-mono text-[9px] text-amber-600 dark:text-amber-400"
                          title={`Shares PAN ${account.pan} with ${panWarning.appliedAccountName} (already applied)`}
                        >
                          ⚠️ PAN Applied
                        </Badge>
                      )}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Other Accounts */}
      {otherAccounts.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Other Accounts (
            {hideAppliedAccounts
              ? `${otherAccounts.filter((a) => !appliedAccountIds.has(a.id)).length} of ${otherAccounts.length}`
              : otherAccounts.length}
            )
          </span>
          {otherAccounts.filter((a) => !appliedAccountIds.has(a.id)).length ===
            0 && hideAppliedAccounts ? (
            <div className="py-2 text-[11px] text-muted-foreground italic">
              All {otherAccounts.length} partner accounts have already applied
              for this IPO.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(hideAppliedAccounts
                ? otherAccounts.filter((a) => !appliedAccountIds.has(a.id))
                : otherAccounts
              ).map((account) => {
                const alreadyApplied = appliedAccountIds.has(account.id)
                const isSelected = selectedAccountIds.includes(account.id)
                const panWarning = !alreadyApplied
                  ? getPanAppliedWarning(account)
                  : null
                const isDuplicatePanSelected =
                  isSelected && problematicAccountIds.has(account.id)

                return (
                  <label
                    key={account.id}
                    className={cn(
                      "flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-none border p-2.5 text-xs transition-all",
                      alreadyApplied &&
                        "cursor-not-allowed border-dashed bg-muted/20 opacity-50",
                      !alreadyApplied &&
                        isDuplicatePanSelected &&
                        "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500",
                      !alreadyApplied &&
                        !isDuplicatePanSelected &&
                        isSelected &&
                        "border-primary bg-primary/5 ring-1 ring-primary",
                      !alreadyApplied &&
                        !isSelected &&
                        panWarning &&
                        "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/70",
                      !alreadyApplied &&
                        !isSelected &&
                        !panWarning &&
                        "border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Checkbox
                        checked={isSelected}
                        disabled={alreadyApplied}
                        onCheckedChange={() =>
                          !alreadyApplied &&
                          onToggleAccountSelection(account.id)
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="block truncate text-xs font-semibold text-foreground"
                            title={account.name}
                          >
                            {account.name}
                          </span>
                          {account.sortIndex !== undefined && (
                            <span className="font-mono text-[9px] text-muted-foreground">
                              #{account.sortIndex + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {account.profitSharePercent}% profit share
                          </span>
                          {account.pan && (
                            <span className="font-mono text-[9px] text-muted-foreground/80">
                              • PAN: {account.pan}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {alreadyApplied && (
                      <Badge
                        variant="outline"
                        className="shrink-0 py-0 font-mono text-[10px]"
                      >
                        Applied
                      </Badge>
                    )}
                    {!alreadyApplied && isDuplicatePanSelected && (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 border-amber-500/60 bg-amber-500/10 font-mono text-[9px] text-amber-600 dark:text-amber-400"
                      >
                        <AlertTriangle className="size-2.5" />
                        <span>Dup PAN</span>
                      </Badge>
                    )}
                    {!alreadyApplied &&
                      !isDuplicatePanSelected &&
                      panWarning && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-amber-500/40 bg-amber-500/10 font-mono text-[9px] text-amber-600 dark:text-amber-400"
                          title={`Shares PAN ${account.pan} with ${panWarning.appliedAccountName} (already applied)`}
                        >
                          ⚠️ PAN Applied
                        </Badge>
                      )}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          size="sm"
          className="rounded-none text-xs"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onProceedToStep2}
          disabled={selectedAccountIds.length === 0}
          size="sm"
          className="rounded-none text-xs"
        >
          Next: Assign Banks, Quota & Lots
          <ArrowRight data-icon="inline-end" />
        </Button>
      </DialogFooter>
    </div>
  )
}
