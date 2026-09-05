"use client"

import { useState, useMemo } from "react"
import {
  ExternalLink,
  Copy,
  Check,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  X,
  CheckCheck,
  User,
  Users,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import {
  updateApplication,
  updateAllotmentsBatch,
} from "@/lib/firebase/applications"
import { updateIpo } from "@/lib/firebase/ipos"
import {
  KNOWN_REGISTRARS,
  detectRegistrar,
  getRegistrarPortalUrl,
  BSE_ALLOTMENT_URL,
} from "@/lib/utils/registrars"
import { formatCurrency } from "@/lib/utils/ipo"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  ApplicationStatus,
} from "@/types"

interface CheckAllotmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  onSuccess: () => void
}

type StatusFilter = "all" | "pending" | "allotted" | "not_allotted"

export function CheckAllotmentDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  applications,
  accounts,
  onSuccess,
}: CheckAllotmentDialogProps) {
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  )

  const detected = detectRegistrar(ipo.registrar)
  const [userSelectedRegistrar, setUserSelectedRegistrar] = useState<{
    ipoId: string
    registrar: string
  } | null>(null)

  const selectedRegistrar =
    userSelectedRegistrar?.ipoId === ipo.id
      ? userSelectedRegistrar.registrar
      : ipo.registrar || detected?.name || ""

  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const portalUrl = getRegistrarPortalUrl(selectedRegistrar, ipo.registrarUrl)
  const activeRegistrarMeta =
    detectRegistrar(selectedRegistrar) ||
    KNOWN_REGISTRARS.find(
      (r) =>
        r.id === selectedRegistrar ||
        r.name.toLowerCase() === selectedRegistrar.toLowerCase()
    )

  const handleCopy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      toast.add({
        title: `${label} Copied`,
        description: `${text} copied to clipboard.`,
        type: "success",
      })
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      toast.add({
        title: "Failed to copy",
        type: "error",
      })
    }
  }

  const handleUpdateStatus = async (
    applicationId: string,
    status: "allotted" | "not_allotted"
  ) => {
    const app = applications.find((a) => a.id === applicationId)
    if (!app) return

    setUpdatingAppId(applicationId)
    try {
      const allottedLots =
        status === "allotted" ? app.allottedLots || app.lotsApplied || 1 : 0
      const allottedShares =
        status === "allotted" ? allottedLots * ipo.lotSize : 0

      await updateApplication(userId, applicationId, {
        status,
        allottedLots,
        allottedShares,
      })

      toast.add({
        title: `Marked as ${status === "allotted" ? "Allotted" : "Not Allotted"}`,
        type: "success",
      })
      onSuccess()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to update status",
        type: "error",
      })
    } finally {
      setUpdatingAppId(null)
    }
  }

  const handleSaveRegistrar = async (registrarName: string) => {
    setUserSelectedRegistrar({ ipoId: ipo.id, registrar: registrarName })
    const detectedReg = detectRegistrar(registrarName)
    try {
      await updateIpo(userId, ipo.id, {
        registrar: registrarName,
        registrarUrl: detectedReg?.checkUrl || null,
      })
      toast.add({
        title: "Registrar updated",
        type: "success",
      })
      onSuccess()
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllPendingNotAllotted = async () => {
    const pendingApps = applications.filter((a) => a.status === "pending")
    if (pendingApps.length === 0) return

    setIsBulkUpdating(true)
    try {
      await updateAllotmentsBatch(
        userId,
        pendingApps.map((a) => ({
          applicationId: a.id,
          status: "not_allotted" as ApplicationStatus,
          allottedLots: 0,
          allottedShares: 0,
        }))
      )
      toast.add({
        title: `Updated ${pendingApps.length} pending applications`,
        description: "All pending applications marked as Not Allotted.",
        type: "success",
      })
      onSuccess()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Bulk update failed",
        type: "error",
      })
    } finally {
      setIsBulkUpdating(false)
    }
  }

  // Progress metrics
  const pendingCount = applications.filter((a) => a.status === "pending").length
  const allottedCount = applications.filter(
    (a) => a.status === "allotted" || a.status === "sold"
  ).length
  const notAllottedCount = applications.filter(
    (a) => a.status === "not_allotted"
  ).length
  const totalCount = applications.length
  const verifiedCount = allottedCount + notAllottedCount
  const progressPercent =
    totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (statusFilter === "pending" && app.status !== "pending") return false
      if (
        statusFilter === "allotted" &&
        app.status !== "allotted" &&
        app.status !== "sold"
      )
        return false
      if (statusFilter === "not_allotted" && app.status !== "not_allotted")
        return false

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const account = accountMap.get(app.accountId)
        const nameMatch = account?.name?.toLowerCase().includes(q)
        const panMatch = account?.pan?.toLowerCase().includes(q)
        const dematMatch = account?.dematAccount?.toLowerCase().includes(q)
        const appNoMatch = app.applicationNumber?.toLowerCase().includes(q)
        return Boolean(nameMatch || panMatch || dematMatch || appNoMatch)
      }

      return true
    })
  }, [applications, statusFilter, searchQuery, accountMap])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92svh] flex-col gap-3.5 p-5 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        {/* Header */}
        <DialogHeader className="gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <DialogTitle className="truncate text-base font-bold">
                Check Allotment — {ipo.name}
              </DialogTitle>
              {ipo.type && (
                <Badge
                  variant={ipo.type === "sme" ? "warning" : "secondary"}
                  className="shrink-0 px-1.5 py-0 font-mono text-[10px] uppercase"
                >
                  {ipo.type}
                </Badge>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs">
              <Badge variant="outline" className="px-2 py-0.5 text-[11px]">
                Issue: {formatCurrency(ipo.issuePrice)}
              </Badge>
              <Badge variant="secondary" className="px-2 py-0.5 text-[11px]">
                {totalCount} {totalCount === 1 ? "App" : "Apps"}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs">
            Verify allotment on the registrar portal with 1-click PAN & Demat
            copy, then record status instantly.
          </DialogDescription>
        </DialogHeader>

        {/* Section 1: Compact Registrar Bar */}
        <div className="flex flex-col gap-2.5 rounded-none border border-border/70 bg-muted/20 p-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-none border border-border/80 bg-background text-primary">
              <Building2 className="size-3.5" />
            </div>
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Registrar:
                </span>
                <span className="truncate text-xs font-bold text-foreground">
                  {selectedRegistrar || "Not Specified"}
                </span>
                {activeRegistrarMeta && (
                  <Badge
                    variant="outline"
                    className="px-1 py-0 text-[9px] font-normal"
                  >
                    Modes:{" "}
                    {activeRegistrarMeta.searchModes
                      .map((m) => m.toUpperCase())
                      .join(" / ")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
            <Select
              value={activeRegistrarMeta?.id || ""}
              onValueChange={(val) => {
                const found = KNOWN_REGISTRARS.find((r) => r.id === val)
                if (found) handleSaveRegistrar(found.name)
              }}
            >
              <SelectTrigger className="h-7 w-36 bg-background text-xs font-normal">
                <SelectValue placeholder="Change Registrar">
                  {activeRegistrarMeta
                    ? activeRegistrarMeta.name
                    : selectedRegistrar || "Select Registrar"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {KNOWN_REGISTRARS.map((reg) => (
                    <SelectItem key={reg.id} value={reg.id} className="text-xs">
                      {reg.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {portalUrl ? (
              <Button
                render={
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                size="sm"
                className="h-7 shrink-0 bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                <span>Open Portal</span>
                <ExternalLink className="size-3" data-icon="inline-end" />
              </Button>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <AlertCircle className="size-3 text-warning-foreground" />
                <span>Pick registrar to get link</span>
              </div>
            )}

            <Button
              render={
                <a
                  href={BSE_ALLOTMENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              variant="outline"
              size="sm"
              className="h-7 shrink-0 bg-background text-xs font-medium"
              title="Official BSE Allotment Status Check Portal"
            >
              <span>BSE Check</span>
              <ExternalLink className="size-3" data-icon="inline-end" />
            </Button>
          </div>
        </div>

        {/* Section 2: Progress & Filter Bar */}
        <div className="flex flex-col gap-2 rounded-none border border-border/70 bg-card p-2.5">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">
                Allotment Status
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                ({verifiedCount}/{totalCount} checked • {progressPercent}%)
              </span>
            </div>

            {pendingCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={isBulkUpdating}
                onClick={handleMarkAllPendingNotAllotted}
                className="h-6 self-start text-[11px] text-muted-foreground hover:text-foreground sm:self-auto"
              >
                <CheckCheck
                  className="size-3 text-muted-foreground"
                  data-icon="inline-start"
                />
                Mark {pendingCount} pending as Not Allotted
              </Button>
            )}
          </div>

          <Progress value={progressPercent} className="h-1 w-full bg-muted" />

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <Button
              type="button"
              variant={statusFilter === "all" ? "default" : "outline"}
              size="xs"
              onClick={() => setStatusFilter("all")}
              className="h-6 text-[11px]"
            >
              All ({totalCount})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="xs"
              onClick={() => setStatusFilter("pending")}
              className="h-6 text-[11px]"
            >
              <Clock
                className="size-3 text-amber-500"
                data-icon="inline-start"
              />
              Pending ({pendingCount})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "allotted" ? "default" : "outline"}
              size="xs"
              onClick={() => setStatusFilter("allotted")}
              className="h-6 text-[11px]"
            >
              <CheckCircle2
                className="size-3 text-emerald-500"
                data-icon="inline-start"
              />
              Allotted ({allottedCount})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "not_allotted" ? "default" : "outline"}
              size="xs"
              onClick={() => setStatusFilter("not_allotted")}
              className="h-6 text-[11px]"
            >
              <XCircle
                className="size-3 text-muted-foreground"
                data-icon="inline-start"
              />
              Not Allotted ({notAllottedCount})
            </Button>
          </div>
        </div>

        {/* Section 3: Search Bar */}
        <div className="flex items-center justify-between gap-2">
          <InputGroup className="h-8 flex-1">
            <InputGroupAddon align="inline-start">
              <Search className="size-3.5 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search by account name, PAN, DP ID, or app #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
            />
            {searchQuery && (
              <InputGroupAddon align="inline-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setSearchQuery("")}
                  className="size-5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </Button>
              </InputGroupAddon>
            )}
          </InputGroup>

          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            Showing {filteredApplications.length} of {totalCount}
          </span>
        </div>

        {/* Section 4: Applications Cards List */}
        <div className="flex max-h-[420px] min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {filteredApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-none border border-dashed border-border/80 bg-muted/10 p-8 text-center">
              <Search className="size-6 text-muted-foreground/60" />
              <div className="text-xs font-semibold text-foreground">
                No applications match your filter
              </div>
              <p className="max-w-xs text-[11px] text-muted-foreground">
                Try clearing the search query or selecting &quot;All&quot; in
                the status filter.
              </p>
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                  }}
                  className="mt-1 text-xs"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            filteredApplications.map((app) => {
              const account = accountMap.get(app.accountId)
              const isAllotted =
                app.status === "allotted" || app.status === "sold"
              const isNotAllotted = app.status === "not_allotted"

              const panKey = `pan-${app.id}`
              const dematKey = `demat-${app.id}`
              const appNoKey = `appno-${app.id}`

              return (
                <div
                  key={app.id}
                  className={cn(
                    "flex shrink-0 flex-col gap-2.5 rounded-none border p-3 transition-all sm:flex-row sm:items-center sm:justify-between",
                    isAllotted
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : isNotAllotted
                        ? "border-border/60 bg-muted/15"
                        : "border-border bg-card"
                  )}
                >
                  {/* Account Details & Identifiers */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <div className="flex items-center gap-1 truncate text-xs font-bold text-foreground">
                        {account?.type === "my" ? (
                          <User className="size-3 shrink-0 text-primary" />
                        ) : (
                          <Users className="size-3 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className="truncate"
                          title={account?.name || "Unknown"}
                        >
                          {account?.name || "Unknown"}
                        </span>
                      </div>

                      <Badge
                        variant={
                          account?.type === "my" ? "secondary" : "default"
                        }
                        className="shrink-0 px-1 py-0 text-[9px] font-normal"
                      >
                        {account?.type === "my"
                          ? "My Account"
                          : `${account?.profitSharePercent}% Profit Share`}
                      </Badge>

                      <Badge
                        variant={
                          isAllotted
                            ? "success"
                            : isNotAllotted
                              ? "secondary"
                              : "outline"
                        }
                        className={cn(
                          "shrink-0 px-1.5 py-0 text-[9px] font-semibold capitalize",
                          isNotAllotted &&
                            "border-border/80 text-muted-foreground"
                        )}
                      >
                        {app.status === "not_allotted"
                          ? "Not Allotted"
                          : app.status}
                      </Badge>

                      <span className="ml-auto font-mono text-[10px] text-muted-foreground sm:ml-0">
                        {app.lotsApplied} lot ({app.sharesApplied} sh) •{" "}
                        {formatCurrency(app.amountApplied)}
                      </span>
                    </div>

                    {/* 1-Click Copy Badges for PAN, Demat, App # */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {account?.pan ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() =>
                            handleCopy(account.pan!, panKey, "PAN")
                          }
                          className="h-6 gap-1 bg-background px-2 font-mono text-[10px] hover:bg-muted"
                          title="Click to copy PAN"
                        >
                          {copiedKey === panKey ? (
                            <Check
                              className="size-2.5 text-success"
                              data-icon="inline-start"
                            />
                          ) : (
                            <Copy
                              className="size-2.5 text-muted-foreground"
                              data-icon="inline-start"
                            />
                          )}
                          <span>PAN: {account.pan}</span>
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="h-6 px-2 font-mono text-[10px] font-normal text-muted-foreground italic"
                        >
                          No PAN saved
                        </Badge>
                      )}

                      {account?.dematAccount && (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() =>
                            handleCopy(
                              account.dematAccount!,
                              dematKey,
                              "Demat ID"
                            )
                          }
                          className="h-6 gap-1 bg-background px-2 font-mono text-[10px] hover:bg-muted"
                          title="Click to copy Demat / DP ID"
                        >
                          {copiedKey === dematKey ? (
                            <Check
                              className="size-2.5 text-success"
                              data-icon="inline-start"
                            />
                          ) : (
                            <Copy
                              className="size-2.5 text-muted-foreground"
                              data-icon="inline-start"
                            />
                          )}
                          <span>DP: {account.dematAccount}</span>
                        </Button>
                      )}

                      {app.applicationNumber && (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() =>
                            handleCopy(
                              app.applicationNumber!,
                              appNoKey,
                              "Application No"
                            )
                          }
                          className="h-6 gap-1 bg-background px-2 font-mono text-[10px] hover:bg-muted"
                          title="Click to copy Application Number"
                        >
                          {copiedKey === appNoKey ? (
                            <Check
                              className="size-2.5 text-success"
                              data-icon="inline-start"
                            />
                          ) : (
                            <Copy
                              className="size-2.5 text-muted-foreground"
                              data-icon="inline-start"
                            />
                          )}
                          <span>App #{app.applicationNumber}</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Verification Toggle Actions */}
                  <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                    <Button
                      type="button"
                      variant={isAllotted ? "default" : "outline"}
                      size="xs"
                      disabled={
                        updatingAppId === app.id ||
                        isBulkUpdating ||
                        app.status === "sold"
                      }
                      onClick={() => handleUpdateStatus(app.id, "allotted")}
                      className={cn(
                        "h-7 gap-1 text-xs font-semibold",
                        isAllotted
                          ? "border-transparent bg-emerald-600 text-white hover:bg-emerald-700"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <CheckCircle2
                        className="size-3"
                        data-icon="inline-start"
                      />
                      Allotted
                      {isAllotted && app.allottedLots
                        ? ` (${app.allottedLots}L)`
                        : ""}
                    </Button>
                    <Button
                      type="button"
                      variant={isNotAllotted ? "secondary" : "outline"}
                      size="xs"
                      disabled={
                        updatingAppId === app.id ||
                        isBulkUpdating ||
                        app.status === "sold"
                      }
                      onClick={() => handleUpdateStatus(app.id, "not_allotted")}
                      className={cn(
                        "h-7 gap-1 text-xs font-semibold",
                        isNotAllotted
                          ? "border-border bg-muted font-bold text-foreground hover:bg-muted/80"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <XCircle
                        className="size-3 text-muted-foreground"
                        data-icon="inline-start"
                      />
                      Not Allotted
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <Separator />

        {/* Footer */}
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-mono text-[11px] text-muted-foreground">
            {verifiedCount} of {totalCount} applications verified (
            {progressPercent}%)
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
