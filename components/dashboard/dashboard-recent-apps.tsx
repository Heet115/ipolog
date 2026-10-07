"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge"
import { calculateApplicationProfit } from "@/lib/calculations/financials"
import { formatCurrency } from "@/lib/utils/ipo"
import type { Ipo, Application, ApplicationAccount } from "@/types"

interface DashboardRecentAppsProps {
  recentApps: Application[]
  soldApps: Application[]
  ipoMap: Map<string, Ipo>
  accountMap: Map<string, ApplicationAccount>
}

export function DashboardRecentApps({
  recentApps,
  soldApps,
  ipoMap,
  accountMap,
}: DashboardRecentAppsProps) {
  const [appTab, setAppTab] = useState<"recent" | "sold">("recent")

  return (
    <Card className="rounded-none border border-border/70 shadow-xs">
      <CardHeader className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <CardTitle className="text-base font-bold text-foreground">
            Application Activity & Returns
          </CardTitle>
          <CardDescription className="text-xs">
            Real-time bidding records, allotment outcomes, and realized gains
          </CardDescription>
        </div>

        {/* Tabs Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-none border border-border/60 bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => setAppTab("recent")}
              className={`rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                appTab === "recent"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Recent Applications
            </button>
            <button
              onClick={() => setAppTab("sold")}
              className={`rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                appTab === "sold"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Realized Sales ({soldApps.length})
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {(appTab === "recent" ? recentApps : soldApps).length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {appTab === "recent"
              ? "No applications recorded yet. Open an IPO to apply with your accounts."
              : "No sold applications recorded yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[550px]">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">Account / IPO</TableHead>
                  <TableHead className="w-20 text-center text-xs">Lots</TableHead>
                  <TableHead className="text-right text-xs">Bid Amount</TableHead>
                  <TableHead className="w-24 text-center text-xs">Status</TableHead>
                  <TableHead className="text-right text-xs">Your Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(appTab === "recent" ? recentApps : soldApps).map((app) => {
                  const account = accountMap.get(app.accountId)
                  const ipo = ipoMap.get(app.ipoId)
                  const profit = ipo
                    ? calculateApplicationProfit(app, ipo, account)
                    : {
                        hasRealized: false,
                        realizedYourProfit: 0,
                        realizedProfitShared: 0,
                      }

                  return (
                    <TableRow key={app.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-medium">
                        <span className="block font-semibold text-foreground">
                          {account?.name || "Account"}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {ipo?.name || "IPO"}
                        </span>
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs">
                        {app.lotsApplied}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs font-medium text-foreground">
                        {formatCurrency(app.amountApplied)}
                      </TableCell>

                      <TableCell className="text-center">
                        <ApplicationStatusBadge status={app.status} />
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs">
                        {profit.hasRealized ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={`font-bold ${
                                profit.realizedYourProfit > 0
                                  ? "text-success"
                                  : profit.realizedYourProfit < 0
                                    ? "text-destructive"
                                    : "text-foreground"
                              }`}
                            >
                              {formatCurrency(profit.realizedYourProfit)}
                            </span>
                            {account?.type === "other" && (
                              <Badge
                                variant={
                                  app.settlementStatus === "settled"
                                    ? "success"
                                    : "warning"
                                }
                                className="px-1 py-0 font-mono text-[8px]"
                              >
                                {app.settlementStatus === "settled"
                                  ? "Settled"
                                  : "Unsettled"}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
