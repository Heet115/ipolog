"use client"

import { Check, Copy, CheckCircle2, XCircle, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils/ipo"
import { cn } from "@/lib/utils"
import type { Application, ApplicationAccount } from "@/types"

interface CheckAllotmentItemProps {
  app: Application
  account?: ApplicationAccount
  copiedKey: string | null
  updatingAppId: string | null
  isBulkUpdating: boolean
  onCopy: (text: string, key: string, label: string) => void
  onUpdateStatus: (
    applicationId: string,
    status: "allotted" | "not_allotted"
  ) => void
}

export function CheckAllotmentItem({
  app,
  account,
  copiedKey,
  updatingAppId,
  isBulkUpdating,
  onCopy,
  onUpdateStatus,
}: CheckAllotmentItemProps) {
  const isAllotted = app.status === "allotted" || app.status === "sold"
  const isNotAllotted = app.status === "not_allotted"

  const panKey = `pan-${app.id}`
  const dematKey = `demat-${app.id}`
  const appNoKey = `appno-${app.id}`

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2.5 rounded-none border p-3 transition-all sm:flex-row sm:items-center sm:justify-between",
        isAllotted
          ? "border-success/40 bg-success/5"
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
            <span className="truncate" title={account?.name || "Unknown"}>
              {account?.name || "Unknown"}
            </span>
          </div>

          <Badge
            variant={account?.type === "my" ? "secondary" : "default"}
            className="shrink-0 px-1 py-0 text-[9px] font-normal"
          >
            {account?.type === "my"
              ? "My Account"
              : `${account?.profitSharePercent}% Profit Share`}
          </Badge>

          <Badge
            variant={
              isAllotted ? "success" : isNotAllotted ? "secondary" : "outline"
            }
            className={cn(
              "shrink-0 px-1.5 py-0 text-[9px] font-semibold capitalize",
              isNotAllotted && "border-border/80 text-muted-foreground"
            )}
          >
            {app.status === "not_allotted" ? "Not Allotted" : app.status}
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
              onClick={() => onCopy(account.pan!, panKey, "PAN")}
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
                onCopy(account.dematAccount!, dematKey, "Demat ID")
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
                onCopy(app.applicationNumber!, appNoKey, "Application No")
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
            updatingAppId === app.id || isBulkUpdating || app.status === "sold"
          }
          onClick={() => onUpdateStatus(app.id, "allotted")}
          className={cn(
            "h-7 gap-1 rounded-none text-xs font-semibold",
            isAllotted
              ? "border-transparent bg-success text-success-foreground hover:bg-success/90"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CheckCircle2 className="size-3" data-icon="inline-start" />
          Allotted
          {isAllotted && app.allottedLots ? ` (${app.allottedLots}L)` : ""}
        </Button>
        <Button
          type="button"
          variant={isNotAllotted ? "secondary" : "outline"}
          size="xs"
          disabled={
            updatingAppId === app.id || isBulkUpdating || app.status === "sold"
          }
          onClick={() => onUpdateStatus(app.id, "not_allotted")}
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
}
