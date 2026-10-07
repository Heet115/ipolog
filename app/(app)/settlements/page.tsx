"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SettlementCenter } from "@/components/settlements/settlement-center"
import { SettlementSkeleton } from "@/components/settlements/settlement-skeleton"
import { useAuth } from "@/lib/firebase/auth-context"
import { getIpos } from "@/lib/firebase/ipos"
import { getApplications } from "@/lib/firebase/applications"
import { getApplicationAccounts } from "@/lib/firebase/accounts"
import { getBankAccounts } from "@/lib/firebase/bank-accounts"
import { usePageTitle } from "@/hooks/use-page-title"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

export default function SettlementsPage() {
  usePageTitle("Settlement Center")
  const { user } = useAuth()

  const [ipos, setIpos] = useState<Ipo[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [accounts, setAccounts] = useState<ApplicationAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  const reloadData = useCallback(() => {
    setFetchTrigger((prev) => prev + 1)
  }, [])

  useEffect(() => {
    let ignore = false
    if (!user) return

    Promise.all([
      getIpos(user.uid, true),
      getApplications(user.uid),
      getApplicationAccounts(user.uid, true),
      getBankAccounts(user.uid, true),
    ])
      .then(([iposData, appsData, accountsData, banksData]) => {
        if (!ignore) {
          setIpos(iposData)
          setApplications(appsData)
          setAccounts(accountsData)
          setBankAccounts(banksData)
          setLoading(false)
          setRefreshing(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load settlement data:", err)
        if (!ignore) {
          setFetchError(true)
          setLoading(false)
          setRefreshing(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user, fetchTrigger])

  const handleManualRefresh = () => {
    setLoading(true)
    setRefreshing(true)
    setFetchError(false)
    reloadData()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Settlement Center
            </h1>
            <Badge
              variant="secondary"
              className="rounded-none px-2 py-0.5 font-mono text-[11px]"
            >
              Partner Ledgers
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Consolidated partner receivables, multi-IPO WhatsApp statements, and
            1-click settlements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="rounded-none text-xs"
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
              data-icon="inline-start"
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <SettlementSkeleton />
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center gap-3 border border-border/70 p-12 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <div className="flex flex-col gap-1">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Failed to load settlements
            </h3>
            <p className="text-xs text-muted-foreground">
              An error occurred while loading settlement accounts and
              applications.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleManualRefresh}>
            Retry
          </Button>
        </div>
      ) : (
        <SettlementCenter
          applications={applications}
          ipos={ipos}
          accounts={accounts}
          bankAccounts={bankAccounts}
          userId={user?.uid || ""}
          userName={user?.displayName || "Me"}
          onRefresh={reloadData}
        />
      )}
    </div>
  )
}
