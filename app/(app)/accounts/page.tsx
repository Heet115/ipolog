"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { AccountDialog } from "@/components/accounts/account-dialog"
import { AccountList } from "@/components/accounts/account-list"
import { AccountListSkeleton } from "@/components/accounts/account-skeleton"
import { toast } from "@/components/ui/toast"
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
  const [accountToEdit, setAccountToEdit] = useState<ApplicationAccount | null>(
    null
  )

  const reloadAll = useCallback(async () => {
    if (!user) return
    try {
      const [accountsData, appsData, iposData] = await Promise.all([
        getApplicationAccounts(user.uid, true),
        getApplications(user.uid),
        getIpos(user.uid, true),
      ])
      const validIpoIds = new Set(iposData.map((i) => i.id))
      setAccounts(accountsData)
      setApplications(appsData.filter((a) => validIpoIds.has(a.ipoId)))
      setIpos(iposData)
    } catch (err) {
      console.error("Failed to load application accounts:", err)
      toast.add({
        title: "Failed to refresh accounts",
        description:
          "Could not load the latest accounts data. Please try again.",
        type: "error",
      })
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
          const validIpoIds = new Set(iposData.map((i) => i.id))
          setAccounts(accountsData)
          setApplications(appsData.filter((a) => validIpoIds.has(a.ipoId)))
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Application Accounts
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your account labels and configure profit-sharing percentages
          </p>
        </div>
        <Button size="sm" onClick={handleAddClick}>
          <Plus data-icon="inline-start" />
          Add Account
        </Button>
      </div>

      {loading ? (
        <AccountListSkeleton />
      ) : accounts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No application accounts yet</EmptyTitle>
            <EmptyDescription>
              Add application accounts like &quot;My Account 1&quot; or
              &quot;Other Account 1&quot; to start recording IPO applications.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={handleAddClick}>
              <Plus data-icon="inline-start" />
              Add First Account
            </Button>
          </EmptyContent>
        </Empty>
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
