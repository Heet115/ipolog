"use client"

import { useState } from "react"
import {
  ExternalLink,
  Copy,
  Check,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
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
import { toast } from "@/components/ui/toast"
import { updateApplication } from "@/lib/firebase/applications"
import { updateIpo } from "@/lib/firebase/ipos"
import {
  KNOWN_REGISTRARS,
  detectRegistrar,
  getRegistrarPortalUrl,
} from "@/lib/utils/registrars"
import type { Ipo, Application, ApplicationAccount } from "@/types"

interface CheckAllotmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  onSuccess: () => void
}

export function CheckAllotmentDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  applications,
  accounts,
  onSuccess,
}: CheckAllotmentDialogProps) {
  const accountMap = new Map(accounts.map((a) => [a.id, a]))

  const detected = detectRegistrar(ipo.registrar)
  const [selectedRegistrar, setSelectedRegistrar] = useState(
    ipo.registrar || detected?.name || ""
  )
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const portalUrl = getRegistrarPortalUrl(selectedRegistrar, ipo.registrarUrl)

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
      const allottedLots = status === "allotted" ? (app.allottedLots || app.lotsApplied || 1) : 0
      const allottedShares = status === "allotted" ? allottedLots * ipo.lotSize : 0

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
    setSelectedRegistrar(registrarName)
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

  const pendingCount = applications.filter((a) => a.status === "pending").length
  const allottedCount = applications.filter(
    (a) => a.status === "allotted" || a.status === "sold"
  ).length
  const notAllottedCount = applications.filter(
    (a) => a.status === "not_allotted"
  ).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DialogTitle className="truncate max-w-md">
              Check Allotment — {ipo.name}
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] font-mono uppercase">
              {applications.length} Applications
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Open the official registrar portal and quickly copy PAN or Demat ID
            for each account to check allotment.
          </DialogDescription>
        </DialogHeader>

        {/* Registrar Banner & Quick Link */}
        <div className="rounded-none border bg-muted/30 p-3.5 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-primary shrink-0" />
              <div>
                <span className="text-[10px] tracking-wider uppercase text-muted-foreground block font-semibold">
                  Official Registrar
                </span>
                <span className="font-bold text-foreground text-sm">
                  {selectedRegistrar || "Not Specified"}
                </span>
              </div>
            </div>

            {portalUrl ? (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-none bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
              >
                <span>Open Allotment Portal</span>
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertCircle className="size-3 text-warning-foreground" />
                <span>Select registrar below to get direct portal link</span>
              </div>
            )}
          </div>

          {/* Quick Registrar Picker */}
          <div className="flex flex-wrap items-center gap-1 border-t border-border/50 pt-2 text-[11px]">
            <span className="text-muted-foreground mr-1 text-[10px]">
              Set Registrar:
            </span>
            {KNOWN_REGISTRARS.map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => handleSaveRegistrar(reg.name)}
                className={`px-2 py-0.5 text-[10px] rounded-none border transition-all ${
                  selectedRegistrar.toLowerCase().includes(reg.id)
                    ? "bg-foreground text-background font-bold border-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                {reg.name}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Summary Strip */}
        <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-success font-semibold">
              <CheckCircle2 className="size-3.5" /> {allottedCount} Allotted
            </span>
            <span className="flex items-center gap-1 text-destructive font-semibold">
              <XCircle className="size-3.5" /> {notAllottedCount} Not Allotted
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3.5" /> {pendingCount} Pending
            </span>
          </div>
          <span className="text-[11px] font-mono">
            {applications.length > 0
              ? `${Math.round(((allottedCount + notAllottedCount) / applications.length) * 100)}% verified`
              : ""}
          </span>
        </div>

        {/* Account Cards / Rows */}
        <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
          {applications.map((app) => {
            const account = accountMap.get(app.accountId)
            const isAllotted = app.status === "allotted" || app.status === "sold"
            const isNotAllotted = app.status === "not_allotted"

            const panKey = `pan-${app.id}`
            const dematKey = `demat-${app.id}`
            const appNoKey = `appno-${app.id}`

            return (
              <div
                key={app.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-none border transition-colors ${
                  isAllotted
                    ? "border-success/40 bg-success/5"
                    : isNotAllotted
                      ? "border-border/60 bg-muted/20 opacity-80"
                      : "border-border bg-card"
                }`}
              >
                {/* Account Details */}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="font-bold text-foreground text-xs truncate"
                      title={account?.name || "Unknown"}
                    >
                      {account?.name || "Unknown"}
                    </span>
                    <Badge
                      variant={account?.type === "my" ? "secondary" : "default"}
                      className="text-[9px] py-0 px-1 font-normal shrink-0"
                    >
                      {account?.type === "my"
                        ? "My"
                        : `${account?.profitSharePercent}%`}
                    </Badge>
                    <Badge
                      variant={
                        isAllotted
                          ? "success"
                          : isNotAllotted
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[9px] py-0 px-1 font-normal capitalize shrink-0"
                    >
                      {app.status}
                    </Badge>
                  </div>

                  {/* PAN, Demat, and App No Badges with 1-Click Copy */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {account?.pan ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(account.pan!, panKey, "PAN")
                        }
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] rounded-none border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                        title="Click to copy PAN"
                      >
                        {copiedKey === panKey ? (
                          <Check className="size-2.5 text-success" />
                        ) : (
                          <Copy className="size-2.5 text-muted-foreground" />
                        )}
                        <span>PAN: {account.pan}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic font-mono">
                        No PAN saved
                      </span>
                    )}

                    {account?.dematAccount && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(account.dematAccount!, dematKey, "Demat ID")
                        }
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] rounded-none border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                        title="Click to copy Demat / DP ID"
                      >
                        {copiedKey === dematKey ? (
                          <Check className="size-2.5 text-success" />
                        ) : (
                          <Copy className="size-2.5 text-muted-foreground" />
                        )}
                        <span>DP: {account.dematAccount}</span>
                      </button>
                    )}

                    {app.applicationNumber && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            app.applicationNumber!,
                            appNoKey,
                            "Application No"
                          )
                        }
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] rounded-none border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                        title="Click to copy Application Number"
                      >
                        {copiedKey === appNoKey ? (
                          <Check className="size-2.5 text-success" />
                        ) : (
                          <Copy className="size-2.5 text-muted-foreground" />
                        )}
                        <span>App #{app.applicationNumber}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline 1-Click Verification Toggles */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <Button
                    type="button"
                    variant={isAllotted ? "default" : "outline"}
                    size="xs"
                    disabled={updatingAppId === app.id || app.status === "sold"}
                    onClick={() => handleUpdateStatus(app.id, "allotted")}
                    className="h-7 text-xs font-semibold"
                  >
                    <CheckCircle2 className="size-3 text-success" />
                    Allotted
                  </Button>
                  <Button
                    type="button"
                    variant={isNotAllotted ? "default" : "outline"}
                    size="xs"
                    disabled={updatingAppId === app.id || app.status === "sold"}
                    onClick={() => handleUpdateStatus(app.id, "not_allotted")}
                    className="h-7 text-xs font-semibold"
                  >
                    <XCircle className="size-3 text-destructive" />
                    Not Allotted
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-end gap-2">
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
