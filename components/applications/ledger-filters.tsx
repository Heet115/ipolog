"use client"

import { Search, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getBankDisplayName } from "@/lib/utils/bank-helpers"
import { CATEGORY_CONFIG } from "@/lib/calculations/categories"
import type {
  Ipo,
  ApplicationAccount,
  BankAccount,
  ApplicationCategory,
} from "@/types"

interface LedgerFiltersProps {
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  isAnyFilterActive: boolean
  onResetFilters: () => void
  selectedIpoId: string
  onSelectedIpoIdChange: (id: string) => void
  ipos: Ipo[]
  ipoMap: Map<string, Ipo>
  ipoApplicationCounts: Map<string, number>
  totalApplicationsCount: number
  selectedAccountId: string
  onSelectedAccountIdChange: (id: string) => void
  accounts: ApplicationAccount[]
  accountMap: Map<string, ApplicationAccount>
  selectedBankId: string
  onSelectedBankIdChange: (id: string) => void
  bankAccounts: BankAccount[]
  bankMap: Map<string, BankAccount>
  selectedCategory: string
  onSelectedCategoryChange: (cat: string) => void
}

export function LedgerFilters({
  searchQuery,
  onSearchQueryChange,
  isAnyFilterActive,
  onResetFilters,
  selectedIpoId,
  onSelectedIpoIdChange,
  ipos,
  ipoMap,
  ipoApplicationCounts,
  totalApplicationsCount,
  selectedAccountId,
  onSelectedAccountIdChange,
  accounts,
  accountMap,
  selectedBankId,
  onSelectedBankIdChange,
  bankAccounts,
  bankMap,
  selectedCategory,
  onSelectedCategoryChange,
}: LedgerFiltersProps) {
  return (
    <Card className="rounded-none border border-border/70 bg-card shadow-none">
      <CardContent className="flex flex-col gap-3.5 p-3.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative max-w-md flex-1">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search IPO, account, bank, PAN, notes..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="h-8 rounded-none bg-background pr-8 pl-8 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {isAnyFilterActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetFilters}
                className="h-8 gap-1 rounded-none text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* 4-Dropdown Selectors Filter Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* IPO Filter */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-ipo"
              className="text-[10px] font-semibold text-muted-foreground uppercase"
            >
              IPO
            </label>
            <Select
              value={selectedIpoId}
              onValueChange={(val) => val && onSelectedIpoIdChange(val)}
            >
              <SelectTrigger
                id="filter-ipo"
                className="h-8 w-full truncate rounded-none bg-background text-xs"
              >
                <SelectValue placeholder="All IPOs">
                  {(val) => {
                    if (!val || val === "all") return "All IPOs"
                    const ipo = ipoMap.get(val)
                    return ipo ? ipo.name : "All IPOs"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60 rounded-none">
                <SelectItem value="all" label="All IPOs">
                  All IPOs ({totalApplicationsCount})
                </SelectItem>
                {ipos.map((ipo) => (
                  <SelectItem key={ipo.id} value={ipo.id} label={ipo.name}>
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate">{ipo.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {ipoApplicationCounts.get(ipo.id) || 0}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Filter */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-account"
              className="text-[10px] font-semibold text-muted-foreground uppercase"
            >
              Account
            </label>
            <Select
              value={selectedAccountId}
              onValueChange={(val) => val && onSelectedAccountIdChange(val)}
            >
              <SelectTrigger
                id="filter-account"
                className="h-8 w-full truncate rounded-none bg-background text-xs"
              >
                <SelectValue placeholder="All Accounts">
                  {(val) => {
                    if (!val || val === "all") return "All Accounts"
                    const acc = accountMap.get(val)
                    return acc ? acc.name : "All Accounts"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60 rounded-none">
                <SelectItem value="all" label="All Accounts">
                  All Accounts ({accounts.length})
                </SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} label={acc.name}>
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate">{acc.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {acc.type === "my"
                          ? "My"
                          : `${acc.profitSharePercent}%`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bank Filter */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-bank"
              className="text-[10px] font-semibold text-muted-foreground uppercase"
            >
              Bank Account
            </label>
            <Select
              value={selectedBankId}
              onValueChange={(val) => val && onSelectedBankIdChange(val)}
            >
              <SelectTrigger
                id="filter-bank"
                className="h-8 w-full truncate rounded-none bg-background text-xs"
              >
                <SelectValue placeholder="All Banks">
                  {(val) => {
                    if (!val || val === "all") return "All Banks"
                    const bank = bankMap.get(val)
                    return bank ? getBankDisplayName(bank) : "All Banks"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60 rounded-none">
                <SelectItem value="all" label="All Banks">
                  All Banks ({bankAccounts.length})
                </SelectItem>
                {bankAccounts.map((b) => (
                  <SelectItem
                    key={b.id}
                    value={b.id}
                    label={getBankDisplayName(b)}
                  >
                    {getBankDisplayName(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-category"
              className="text-[10px] font-semibold text-muted-foreground uppercase"
            >
              Quota Category
            </label>
            <Select
              value={selectedCategory}
              onValueChange={(val) => val && onSelectedCategoryChange(val)}
            >
              <SelectTrigger
                id="filter-category"
                className="h-8 w-full truncate rounded-none bg-background text-xs"
              >
                <SelectValue placeholder="All Categories">
                  {(val) => {
                    if (!val || val === "all") return "All Categories"
                    return (
                      CATEGORY_CONFIG[val as ApplicationCategory]?.label ||
                      val
                    )
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="all" label="All Categories">
                  All Categories
                </SelectItem>
                <SelectItem value="retail" label="Retail (< ₹2L)">
                  Retail (&lt; ₹2L)
                </SelectItem>
                <SelectItem value="shni" label="Small HNI (₹2L - ₹10L)">
                  Small HNI (₹2L - ₹10L)
                </SelectItem>
                <SelectItem value="bhni" label="Big HNI (> ₹10L)">
                  Big HNI (&gt; ₹10L)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
