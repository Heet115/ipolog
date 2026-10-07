"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate, getIpoStatus } from "@/lib/utils/ipo"
import type { Ipo, Application, ApplicationAccount } from "@/types"

interface DashboardActiveIposProps {
  activeIpos: Ipo[]
  openIpos: Ipo[]
  allotmentIpos: Ipo[]
  applications: Application[]
  accounts: ApplicationAccount[]
}

export function DashboardActiveIpos({
  activeIpos,
  openIpos,
  allotmentIpos,
  applications,
  accounts,
}: DashboardActiveIposProps) {
  const [ipoTab, setIpoTab] = useState<"all" | "open" | "allotment">("all")

  const displayedIpos =
    ipoTab === "open"
      ? openIpos
      : ipoTab === "allotment"
        ? allotmentIpos
        : activeIpos

  const activeAccountsCount = accounts.filter((a) => !a.archived).length

  return (
    <Card className="rounded-none border border-border/70 shadow-xs">
      <CardHeader className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <CardTitle className="text-base font-bold text-foreground">
            Active IPO Pipeline
          </CardTitle>
          <CardDescription className="text-xs">
            Schedules, price bands, and multi-account application coverage
          </CardDescription>
        </div>

        {/* Filter Tabs & Browse Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-none border border-border/60 bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => setIpoTab("all")}
              className={`rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                ipoTab === "all"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({activeIpos.length})
            </button>
            <button
              onClick={() => setIpoTab("open")}
              className={`rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                ipoTab === "open"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Open ({openIpos.length})
            </button>
            <button
              onClick={() => setIpoTab("allotment")}
              className={`rounded-none px-2.5 py-1 text-xs font-medium transition-colors ${
                ipoTab === "allotment"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Allotment ({allotmentIpos.length})
            </button>
          </div>

          <Button
            variant="ghost"
            size="xs"
            className="text-xs"
            nativeButton={false}
            render={<Link href="/ipos" />}
          >
            All IPOs
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {displayedIpos.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No IPOs matching this filter right now. Click &quot;Add IPO&quot; to
            track upcoming issues.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[550px]">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">IPO & Category</TableHead>
                  <TableHead className="text-xs">Timeline Status</TableHead>
                  <TableHead className="text-right text-xs">
                    Price & Min Bid
                  </TableHead>
                  <TableHead className="text-center text-xs">
                    Account Coverage
                  </TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedIpos.map((ipo) => {
                  const derived = getIpoStatus(ipo)
                  const ipoApps = applications.filter((a) => a.ipoId === ipo.id)
                  const minInvestment = ipo.issuePrice * ipo.lotSize

                  return (
                    <TableRow key={ipo.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/ipos/${ipo.id}`}
                            className="font-semibold text-foreground hover:underline"
                          >
                            {ipo.name}
                          </Link>
                          <Badge
                            variant={
                              ipo.type === "sme" ? "outline" : "secondary"
                            }
                            className="px-1.5 py-0 font-mono text-[9px] uppercase"
                          >
                            {ipo.type}
                          </Badge>
                        </div>
                        <span className="block text-[11px] text-muted-foreground">
                          {ipo.lotSize} shares / lot
                        </span>
                      </TableCell>

                      <TableCell className="text-xs">
                        <Badge
                          variant={
                            derived.status === "open"
                              ? "success"
                              : derived.status === "upcoming"
                                ? "outline"
                                : "secondary"
                          }
                          className="px-2 py-0.5 text-xs font-medium"
                        >
                          {derived.label}
                        </Badge>
                        {ipo.closeDate && (
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            Closes: {formatDate(ipo.closeDate)}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right text-xs">
                        <span className="font-mono font-semibold text-foreground">
                          {formatCurrency(ipo.issuePrice)}
                        </span>
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {formatCurrency(minInvestment)} / lot
                        </span>
                      </TableCell>

                      <TableCell className="text-center text-xs">
                        <span className="font-mono font-semibold text-foreground">
                          {ipoApps.length} / {activeAccountsCount}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          accounts applied
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-7 text-xs"
                          nativeButton={false}
                          render={<Link href={`/ipos/${ipo.id}`} />}
                        >
                          View
                        </Button>
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
