"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { BankAccountDialog } from "@/components/bank-accounts/bank-account-dialog"
import { BankAccountList } from "@/components/bank-accounts/bank-account-list"
import { BankListSkeleton } from "@/components/bank-accounts/bank-skeleton"
import { toast } from "@/components/ui/toast"
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
      toast.add({
        title: "Failed to refresh bank accounts",
        description: "Could not load the latest bank accounts data. Please try again.",
        type: "error",
      })
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Bank Accounts</h1>
          <p className="text-xs text-muted-foreground">
            Manage the bank accounts you use for IPO application payments and
            refunds
          </p>
        </div>
        <Button size="sm" onClick={handleAddClick}>
          <Plus data-icon="inline-start" />
          Add Bank Account
        </Button>
      </div>

      {loading ? (
        <BankListSkeleton />
      ) : bankAccounts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Landmark />
            </EmptyMedia>
            <EmptyTitle>No bank accounts yet</EmptyTitle>
            <EmptyDescription>
              Add bank accounts (e.g. &quot;HDFC Bank •1234&quot;, &quot;SBI
              •5678&quot;) to link with your IPO applications.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={handleAddClick}>
              <Plus data-icon="inline-start" />
              Add First Bank Account
            </Button>
          </EmptyContent>
        </Empty>
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
