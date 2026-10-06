"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MasterApplicationLedger } from "@/components/applications/master-application-ledger"
import { MasterLedgerSkeleton } from "@/components/applications/master-ledger-skeleton"
import { useAuth } from "@/lib/firebase/auth-context"
import { getIpos } from "@/lib/firebase/ipos"
import { getApplications } from "@/lib/firebase/applications"
import { getApplicationAccounts } from "@/lib/firebase/accounts"
import { getBankAccounts } from "@/lib/firebase/bank-accounts"
import { usePageTitle } from "@/hooks/use-page-title"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

export default function ApplicationsPage() {
  usePageTitle("Applications Ledger")
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
        console.error("Failed to load applications ledger data:", err)
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
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl font-mono uppercase">
              Applications Ledger
            </h1>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Cross-IPO portfolio management of all submitted applications, allotment statuses, and investor settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading || refreshing}
            className="h-8 gap-1.5 rounded-none text-xs font-semibold"
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error State */}
      {fetchError ? (
        <Card className="rounded-none border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <AlertTriangle className="size-8 text-destructive" />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-foreground">
                Failed to Load Applications Ledger
              </h3>
              <p className="text-xs text-muted-foreground">
                Could not retrieve application data from Firestore. Please check your connection and try again.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={reloadData}
              className="gap-1.5 rounded-none text-xs"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        /* Loading Skeleton */
        <MasterLedgerSkeleton />
      ) : (
        /* Main Ledger */
        <MasterApplicationLedger
          ipos={ipos}
          applications={applications}
          accounts={accounts}
          bankAccounts={bankAccounts}
          userId={user?.uid || ""}
          onRefresh={reloadData}
        />
      )}
    </div>
  )
}
