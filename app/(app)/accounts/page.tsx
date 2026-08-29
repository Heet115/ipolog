"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AccountDialog } from "@/components/accounts/account-dialog"
import { AccountList } from "@/components/accounts/account-list"
import { useAuth } from "@/lib/firebase/auth-context"
import { getApplicationAccounts } from "@/lib/firebase/accounts"
import { getApplications } from "@/lib/firebase/applications"
import { getIpos } from "@/lib/firebase/ipos"
import type { ApplicationAccount, Application, Ipo } from "@/types"

export default function AccountsPage() {
  const { user } = useAuth()

  const [accounts, setAccounts] = useState<ApplicationAccount[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [ipos, setIpos] = useState<Ipo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [accountToEdit, setAccountToEdit] =
    useState<ApplicationAccount | null>(null)

  const reloadAll = useCallback(async () => {
    if (!user) return
    try {
      const [accountsData, appsData, iposData] = await Promise.all([
        getApplicationAccounts(user.uid, true),
        getApplications(user.uid),
        getIpos(user.uid, true),
      ])
      setAccounts(accountsData)
      setApplications(appsData)
      setIpos(iposData)
    } catch (err) {
      console.error("Failed to load application accounts:", err)
    }
  }, [user])

  useEffect(() => {
    let ignore = false
    if (!user) return

    Promise.all([
      getApplicationAccounts(user.uid, true),
      getApplications(user.uid),
      getIpos(user.uid, true),
    ])
      .then(([accountsData, appsData, iposData]) => {
        if (!ignore) {
          setAccounts(accountsData)
          setApplications(appsData)
          setIpos(iposData)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load application accounts:", err)
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user])

  const handleAddClick = () => {
    setAccountToEdit(null)
    setDialogOpen(true)
  }

  const handleEditClick = (account: ApplicationAccount) => {
    setAccountToEdit(account)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Application Accounts
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your account labels and configure profit-sharing percentages
          </p>
        </div>
        <Button size="sm" onClick={handleAddClick}>
          <Plus className="mr-1.5 size-4" />
          Add Account
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <h2 className="mt-3 text-sm font-semibold text-foreground">
            No application accounts yet
          </h2>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Add application accounts like &quot;My Account 1&quot; or &quot;Other
            Account 1&quot; to start recording IPO applications.
          </p>
          <Button size="sm" className="mt-4" onClick={handleAddClick}>
            <Plus className="mr-1.5 size-3.5" />
            Add First Account
          </Button>
        </div>
      ) : (
        <AccountList
          accounts={accounts}
          applications={applications}
          ipos={ipos}
          userId={user?.uid || ""}
          onEdit={handleEditClick}
          onRefresh={reloadAll}
        />
      )}

      {/* Add / Edit Dialog */}
      {user && (
        <AccountDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={user.uid}
          accountToEdit={accountToEdit}
          onSuccess={reloadAll}
        />
      )}
    </div>
  )
}
