"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Landmark, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BankAccountDialog } from "@/components/bank-accounts/bank-account-dialog"
import { BankAccountList } from "@/components/bank-accounts/bank-account-list"
import { useAuth } from "@/lib/firebase/auth-context"
import { getBankAccounts } from "@/lib/firebase/bank-accounts"
import { getApplications } from "@/lib/firebase/applications"
import { getIpos } from "@/lib/firebase/ipos"
import type { BankAccount, Application, Ipo } from "@/types"

export default function BankAccountsPage() {
  const { user } = useAuth()

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [ipos, setIpos] = useState<Ipo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bankAccountToEdit, setBankAccountToEdit] =
    useState<BankAccount | null>(null)

  const reloadAll = useCallback(async () => {
    if (!user) return
    try {
      const [banksData, appsData, iposData] = await Promise.all([
        getBankAccounts(user.uid, true),
        getApplications(user.uid),
        getIpos(user.uid, true),
      ])
      setBankAccounts(banksData)
      setApplications(appsData)
      setIpos(iposData)
    } catch (err) {
      console.error("Failed to load bank accounts data:", err)
    }
  }, [user])

  useEffect(() => {
    let ignore = false
    if (!user) return

    Promise.all([
      getBankAccounts(user.uid, true),
      getApplications(user.uid),
      getIpos(user.uid, true),
    ])
      .then(([banksData, appsData, iposData]) => {
        if (!ignore) {
          setBankAccounts(banksData)
          setApplications(appsData)
          setIpos(iposData)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load bank accounts:", err)
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user])

  const handleAddClick = () => {
    setBankAccountToEdit(null)
    setDialogOpen(true)
  }

  const handleEditClick = (bank: BankAccount) => {
    setBankAccountToEdit(bank)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Bank Accounts
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage the bank accounts you use for IPO application payments and
            refunds
          </p>
        </div>
        <Button size="sm" onClick={handleAddClick}>
          <Plus className="mr-1.5 size-4" />
          Add Bank Account
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : bankAccounts.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Landmark className="size-6 text-muted-foreground" />
          </div>
          <h2 className="mt-3 text-sm font-semibold text-foreground">
            No bank accounts yet
          </h2>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Add bank accounts (e.g. &quot;HDFC Bank •1234&quot;, &quot;SBI
            •5678&quot;) to link with your IPO applications.
          </p>
          <Button size="sm" className="mt-4" onClick={handleAddClick}>
            <Plus className="mr-1.5 size-3.5" />
            Add First Bank Account
          </Button>
        </div>
      ) : (
        <BankAccountList
          bankAccounts={bankAccounts}
          applications={applications}
          ipos={ipos}
          userId={user?.uid || ""}
          onEdit={handleEditClick}
          onRefresh={reloadAll}
        />
      )}

      {/* Add / Edit Dialog */}
      {user && (
        <BankAccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={user.uid}
          bankAccountToEdit={bankAccountToEdit}
          onSuccess={reloadAll}
        />
      )}
    </div>
  )
}
