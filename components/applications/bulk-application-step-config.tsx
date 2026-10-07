"use client"

import {
  ArrowLeft,
  Check,
  Plus,
  Minus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { DialogFooter } from "@/components/ui/dialog"
import {
  calculateSharesApplied,
  calculateAmountApplied,
} from "@/lib/calculations/financials"
import { formatCurrency, formatBankAccount } from "@/lib/utils/ipo"
import {
  CATEGORY_CONFIG,
  ALL_CATEGORIES,
  validateCategoryLots,
} from "@/lib/calculations/categories"
import type {
  Ipo,
  ApplicationAccount,
  BankAccount,
  ApplicationCategory,
} from "@/types"
import type {
  AccountConfig,
  BulkAppSortColumn,
} from "@/hooks/use-bulk-application"

interface BulkApplicationStepConfigProps {
  ipo: Ipo
  selectedAccountIds: string[]
  sortedSelectedAccountIds: string[]
  accountMap: Map<string, ApplicationAccount>
  activeBankAccounts: BankAccount[]
  accountConfigs: Record<string, AccountConfig>
  defaultCategory: ApplicationCategory
  onApplyGlobalCategory: (cat: ApplicationCategory) => void
  defaultBankId: string
  onApplyGlobalBank: (bankId: string) => void
  defaultLots: number
  onApplyGlobalLots: (lots: number) => void
  minShniLots: number
  minBhniLots: number
  oneLotAmount: number
  bankAsbaBreaches: Array<{
    bank: BankAccount
    currentBlocked: number
    newBlocked: number
    totalAfter: number
    limit: number
    exceededAmount: number
  }>
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
  sortColumn: BulkAppSortColumn
  sortDirection: "asc" | "desc"
  onToggleSort: (
    col: "account" | "bank" | "category" | "lots" | "amount"
  ) => void
  onUpdateIndividualBank: (accountId: string, bankId: string) => void
  onUpdateIndividualCategory: (
    accountId: string,
    cat: ApplicationCategory
  ) => void
  onUpdateIndividualLots: (accountId: string, lots: number) => void
  totalLots: number
  totalAmount: number
  loading: boolean
  onBack: () => void
  onSubmit: () => void
}

export function BulkApplicationStepConfig({
  ipo,
  selectedAccountIds,
  sortedSelectedAccountIds,
  accountMap,
  activeBankAccounts,
  accountConfigs,
  defaultCategory,
  onApplyGlobalCategory,
  defaultBankId,
  onApplyGlobalBank,
  defaultLots,
  onApplyGlobalLots,
  minShniLots,
  minBhniLots,
  oneLotAmount,
  bankAsbaBreaches,
  hasDuplicatePanIssues,
  intraBatchDuplicatePans,
  selectedPanConflictsWithApplied,
  problematicAccountIds,
  sortColumn,
  sortDirection,
  onToggleSort,
  onUpdateIndividualBank,
  onUpdateIndividualCategory,
  onUpdateIndividualLots,
  totalLots,
  totalAmount,
  loading,
  onBack,
  onSubmit,
}: BulkApplicationStepConfigProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Global Defaults Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-none border bg-muted/40 p-3 text-xs sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1">
          <label className="block truncate text-[11px] font-semibold text-muted-foreground">
            Apply Quota to All
          </label>
          <Select
            value={defaultCategory}
            onValueChange={(val) =>
              val && onApplyGlobalCategory(val as ApplicationCategory)
            }
          >
            <SelectTrigger className="h-8 w-full bg-background text-xs">
              <SelectValue>
                {CATEGORY_CONFIG[defaultCategory].label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ALL_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_CONFIG[cat].label} (
                  {CATEGORY_CONFIG[cat].amountLimitText})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label className="block truncate text-[11px] font-semibold text-muted-foreground">
            Apply Bank to All
          </label>
          <Select
            value={defaultBankId}
            onValueChange={(val) => val && onApplyGlobalBank(val)}
          >
            <SelectTrigger className="h-8 w-full bg-background text-xs">
              <SelectValue placeholder="Select bank">
                {(val) => {
                  const b = activeBankAccounts.find((acc) => acc.id === val)
                  return b ? formatBankAccount(b) : "Select bank"
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {activeBankAccounts.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {formatBankAccount(b)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label className="block truncate text-[11px] font-semibold text-muted-foreground">
            Apply Lots to All
          </label>
          <div className="flex h-8 items-center rounded-none border bg-background px-1">
            <button
              type="button"
              disabled={defaultLots <= 1}
              onClick={() => onApplyGlobalLots(defaultLots - 1)}
              className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              aria-label="Decrease default lots"
            >
              <Minus className="size-3" />
            </button>
            <Input
              type="number"
              min="1"
              step="1"
              value={defaultLots}
              onChange={(e) => onApplyGlobalLots(Number(e.target.value))}
              aria-label="Default lots"
              className="h-6 [appearance:textfield] border-0 p-0 text-center text-xs font-bold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onApplyGlobalLots(defaultLots + 1)}
              className="px-2 py-1 text-muted-foreground hover:text-foreground"
              aria-label="Increase default lots"
            >
              <Plus className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="font-semibold text-muted-foreground">
          Quick Presets:
        </span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="h-6 px-2 text-[10px]"
          onClick={() => onApplyGlobalCategory("retail")}
        >
          1-Lot Retail ({formatCurrency(oneLotAmount)})
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="h-6 px-2 text-[10px]"
          onClick={() => onApplyGlobalCategory("shni")}
        >
          Min sHNI ({minShniLots} lots •{" "}
          {formatCurrency(minShniLots * oneLotAmount)})
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="h-6 px-2 text-[10px]"
          onClick={() => onApplyGlobalCategory("bhni")}
        >
          Min bHNI ({minBhniLots} lots •{" "}
          {formatCurrency(minBhniLots * oneLotAmount)})
        </Button>
      </div>

      {/* ASBA Limit Warning for Current Batch */}
      {bankAsbaBreaches.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-none border border-destructive/60 bg-destructive/10 p-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-destructive">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>
              ASBA Capital Limit Warning: Selected bank account(s) will exceed
              balance limit
            </span>
          </div>
          <div className="flex flex-col gap-1 pl-5 text-[11px] text-foreground">
            {bankAsbaBreaches.map((b) => (
              <div
                key={b.bank.id}
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="font-semibold">
                  {formatBankAccount(b.bank)}:
                </span>
                <span>
                  Total blocked will become{" "}
                  <span className="font-mono font-bold text-destructive">
                    {formatCurrency(b.totalAfter)}
                  </span>
                </span>
                <span className="text-muted-foreground">vs limit</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(b.limit)}
                </span>
                <Badge
                  variant="destructive"
                  className="px-1 py-0 font-mono text-[9px]"
                >
                  Exceeds by {formatCurrency(b.exceededAmount)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate PAN Warning for Current Batch */}
      {hasDuplicatePanIssues && (
        <div className="flex flex-col gap-1.5 rounded-none border border-amber-500/60 bg-amber-500/10 p-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>
              Duplicate PAN Warning: Identical PANs detected across applications
            </span>
          </div>
          <div className="flex flex-col gap-1 pl-5 text-[11px] text-foreground">
            {intraBatchDuplicatePans.map((d) => (
              <div key={d.pan}>
                • <strong>{d.accounts.map((a) => a.name).join(" and ")}</strong>{" "}
                share PAN <span className="font-mono font-bold">{d.pan}</span>
              </div>
            ))}
            {selectedPanConflictsWithApplied.map((c) => (
              <div key={c.selectedAccount.id}>
                • <strong>{c.selectedAccount.name}</strong> shares PAN{" "}
                <span className="font-mono font-bold">{c.pan}</span> with
                already-applied <strong>{c.appliedAccount.name}</strong>
              </div>
            ))}
            <span className="mt-0.5 text-[10px] text-muted-foreground">
              Registrars and stock exchanges automatically disqualify duplicate
              applications submitted with matching PANs.
            </span>
          </div>
        </div>
      )}

      {/* Detailed Applications Table */}
      <div className="max-h-[300px] min-w-0 overflow-x-auto overflow-y-auto rounded-none border border-border/80">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="border-b border-border/70 bg-muted/30">
              <TableHead className="h-9 min-w-[170px] text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                <button
                  type="button"
                  onClick={() => onToggleSort("account")}
                  className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
                >
                  Account
                  {sortColumn === "account" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3 text-foreground" />
                    ) : (
                      <ArrowDown className="size-3 text-foreground" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                  )}
                </button>
              </TableHead>
              <TableHead className="h-9 min-w-[180px] text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                <button
                  type="button"
                  onClick={() => onToggleSort("bank")}
                  className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
                >
                  Bank Account
                  {sortColumn === "bank" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3 text-foreground" />
                    ) : (
                      <ArrowDown className="size-3 text-foreground" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                  )}
                </button>
              </TableHead>
              <TableHead className="h-9 w-[120px] text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                <button
                  type="button"
                  onClick={() => onToggleSort("category")}
                  className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
                >
                  Quota
                  {sortColumn === "category" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3 text-foreground" />
                    ) : (
                      <ArrowDown className="size-3 text-foreground" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                  )}
                </button>
              </TableHead>
              <TableHead className="h-9 w-[80px] text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                <button
                  type="button"
                  onClick={() => onToggleSort("lots")}
                  className="mx-auto inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
                >
                  Lots
                  {sortColumn === "lots" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3 text-foreground" />
                    ) : (
                      <ArrowDown className="size-3 text-foreground" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                  )}
                </button>
              </TableHead>
              <TableHead className="h-9 text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                Shares
              </TableHead>
              <TableHead className="h-9 text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                <button
                  type="button"
                  onClick={() => onToggleSort("amount")}
                  className="ml-auto inline-flex flex-row-reverse items-center gap-1 font-semibold transition-colors hover:text-foreground"
                >
                  Amount
                  {sortColumn === "amount" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3 text-foreground" />
                    ) : (
                      <ArrowDown className="size-3 text-foreground" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                  )}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSelectedAccountIds.map((accountId) => {
              const account = accountMap.get(accountId)
              const cfg = accountConfigs[accountId]
              const lots = cfg?.lots || defaultLots
              const bankId = cfg?.bankAccountId || defaultBankId
              const cat = cfg?.category || defaultCategory
              const shares = calculateSharesApplied(lots, ipo.lotSize)
              const amount = calculateAmountApplied(
                lots,
                ipo.lotSize,
                ipo.issuePrice
              )
              const validation = validateCategoryLots(
                cat,
                lots,
                ipo.lotSize,
                ipo.issuePrice
              )

              return (
                <TableRow key={accountId}>
                  <TableCell className="text-xs font-medium">
                    <div className="flex max-w-[210px] min-w-0 flex-wrap items-center gap-1.5">
                      <span
                        className="block truncate font-semibold text-foreground"
                        title={account?.name}
                      >
                        {account?.name}
                      </span>
                      <Badge
                        variant={
                          account?.type === "my" ? "secondary" : "default"
                        }
                        className="shrink-0 px-1 py-0 text-[9px] font-normal"
                      >
                        {account?.type === "my"
                          ? "My"
                          : `${account?.profitSharePercent}%`}
                      </Badge>
                      {problematicAccountIds.has(accountId) && (
                        <Badge
                          variant="outline"
                          className="shrink-0 gap-1 border-amber-500/60 bg-amber-500/10 px-1 py-0 font-mono text-[9px] text-amber-600 dark:text-amber-400"
                          title={
                            account?.pan
                              ? `Duplicate PAN detected: ${account.pan}`
                              : "Duplicate PAN detected"
                          }
                        >
                          <AlertTriangle className="size-2.5" />
                          <span>Dup PAN</span>
                        </Badge>
                      )}
                    </div>
                    {account?.pan && (
                      <span className="block font-mono text-[9px] text-muted-foreground">
                        PAN: {account.pan}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Select
                      value={bankId}
                      onValueChange={(val) =>
                        val && onUpdateIndividualBank(accountId, val)
                      }
                    >
                      <SelectTrigger className="h-7 w-full truncate bg-background text-xs">
                        <SelectValue placeholder="Select bank">
                          {(val) => {
                            const b = activeBankAccounts.find(
                              (acc) => acc.id === val
                            )
                            return b ? formatBankAccount(b) : "Select bank"
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {activeBankAccounts.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {formatBankAccount(b)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Select
                      value={cat}
                      onValueChange={(val) =>
                        val &&
                        onUpdateIndividualCategory(
                          accountId,
                          val as ApplicationCategory
                        )
                      }
                    >
                      <SelectTrigger className="h-7 w-28 truncate bg-background text-xs">
                        <SelectValue>
                          <Badge
                            variant={CATEGORY_CONFIG[cat].badgeVariant}
                            className="px-1 py-0 font-mono text-[9px]"
                          >
                            {CATEGORY_CONFIG[cat].shortLabel}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_CONFIG[c].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col items-center">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={lots}
                        onChange={(e) =>
                          onUpdateIndividualLots(
                            accountId,
                            Number(e.target.value)
                          )
                        }
                        aria-label={`Lots for ${account?.name || "account"}`}
                        className="h-7 w-16 px-1.5 text-center text-xs font-bold"
                      />
                      {!validation.isValid && (
                        <span
                          className="max-w-[80px] truncate text-[9px] font-medium text-destructive"
                          title={validation.warning}
                        >
                          ⚠️ Out of range
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {shares}
                  </TableCell>

                  <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                    {formatCurrency(amount)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Review Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-border bg-muted/30 p-3 text-xs">
        <div className="min-w-0">
          <span className="block text-[11px] font-medium text-muted-foreground">
            Total Mandate Commitment:
          </span>
          <span className="font-mono text-base font-bold text-foreground">
            {formatCurrency(totalAmount)}
          </span>
        </div>
        <div className="min-w-0 text-right">
          <span className="block text-[11px] font-medium text-muted-foreground">
            Applications / Lots:
          </span>
          <span className="font-mono text-xs font-bold text-foreground">
            {selectedAccountIds.length} Accounts ({totalLots} Lots •{" "}
            {totalLots * ipo.lotSize} Shares)
          </span>
        </div>
      </div>

      <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={loading}
          size="sm"
          className="rounded-none text-xs"
        >
          <ArrowLeft data-icon="inline-start" />
          Back to Accounts
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          size="sm"
          className="rounded-none text-xs"
        >
          {loading && <Spinner data-icon="inline-start" />}
          {loading ? (
            "Recording Applications..."
          ) : (
            <>
              <Check data-icon="inline-start" />
              Confirm & Submit ({selectedAccountIds.length})
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  )
}
