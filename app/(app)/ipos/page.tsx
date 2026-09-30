"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  FileText,
  Download,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { IpoDialog } from "@/components/ipo/ipo-dialog"
import { ImportIpoDialog } from "@/components/ipo/import-ipo-dialog"
import { IpoList } from "@/components/ipo/ipo-list"
import { IpoListSkeleton } from "@/components/ipo/ipo-skeleton"
import { useAuth } from "@/lib/firebase/auth-context"
import { getIpos } from "@/lib/firebase/ipos"
import { getApplications } from "@/lib/firebase/applications"
import { isIpoSyncStale, getIpoStatus } from "@/lib/utils/ipo"
import { usePageTitle } from "@/hooks/use-page-title"
import type { Ipo, Application } from "@/types"

export default function IposPage() {
  usePageTitle("My IPOs")
  const { user } = useAuth()
  const router = useRouter()

  const [ipos, setIpos] = useState<Ipo[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [ipoToEdit, setIpoToEdit] = useState<Ipo | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  const reloadData = useCallback(() => {
    setFetchTrigger((prev) => prev + 1)
  }, [])

  useEffect(() => {
    const handleAutoRefreshed = () => {
      reloadData()
    }
    window.addEventListener("ipos-auto-refreshed", handleAutoRefreshed)
    return () => {
      window.removeEventListener("ipos-auto-refreshed", handleAutoRefreshed)
    }
  }, [reloadData])

  useEffect(() => {
    let ignore = false
    if (!user) return

    Promise.all([getIpos(user.uid, true), getApplications(user.uid)])
      .then(([iposData, appsData]) => {
        if (!ignore) {
          const validIpoIds = new Set(iposData.map((i) => i.id))
          setIpos(iposData)
          setApplications(appsData.filter((a) => validIpoIds.has(a.ipoId)))
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load IPOs:", err)
        if (!ignore) {
          setFetchError(true)
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user, fetchTrigger])

  const handleSyncAll = async () => {
    if (!user) return
    setSyncingAll(true)
    const isOutdatedSync = staleCount > 0
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/ipos/auto-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ force: !isOutdatedSync }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to refresh IPOs.")
      }
      toast.add({
        title: "Sync Complete",
        description: isOutdatedSync
          ? `Refreshed ${data.refreshedCount} outdated IPO(s).`
          : `Refreshed ${data.refreshedCount} imported IPO(s).`,
        type: "success",
      })
      reloadData()
    } catch (err) {
      toast.add({
        title: "Sync Failed",
        description:
          err instanceof Error ? err.message : "Could not sync IPOs.",
        type: "error",
      })
    } finally {
      setSyncingAll(false)
    }
  }

  const handleAddClick = () => {
    setIpoToEdit(null)
    setDialogOpen(true)
  }

  const handleEditClick = (ipo: Ipo) => {
    setIpoToEdit(ipo)
    setDialogOpen(true)
  }

  const handleSuccess = (newIpoId?: string) => {
    reloadData()
    if (newIpoId && !ipoToEdit) {
      router.push(`/ipos/${newIpoId}`)
    }
  }

  const activeIpos = ipos.filter((i) => !i.archived)
  const importedCount = activeIpos.filter((i) => Boolean(i.externalId)).length
  const staleCount = activeIpos.filter((i) => isIpoSyncStale(i)).length

  const openCount = activeIpos.filter(
    (i) => getIpoStatus(i).status === "open"
  ).length
  const upcomingCount = activeIpos.filter(
    (i) => getIpoStatus(i).status === "upcoming"
  ).length
  const allotmentPendingCount = activeIpos.filter(
    (i) => getIpoStatus(i).status === "allotment_pending"
  ).length
  const smeCount = activeIpos.filter((i) => i.type === "sme").length
  const mainboardCount = activeIpos.filter((i) => i.type === "mainboard").length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              My IPOs
            </h1>
            <Badge
              variant="secondary"
              className="rounded-none px-2 py-0.5 font-mono text-[11px]"
            >
              {activeIpos.length} Active
            </Badge>
            {importedCount > 0 && (
              <Badge
                variant="outline"
                className="rounded-none border-primary/30 font-mono text-[10px] text-muted-foreground"
                title="Imported IPOs are refreshed automatically every 24 hours"
              >
                Auto-sync: 24h
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Track issue timelines, multi-account bids, allotments, and listing gains
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {importedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="rounded-none text-xs"
            >
              <RefreshCw
                className={`size-3.5 ${syncingAll ? "animate-spin" : ""}`}
                data-icon="inline-start"
              />
              {syncingAll
                ? "Syncing..."
                : staleCount > 0
                  ? `Sync Outdated (${staleCount})`
                  : "Sync All"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="rounded-none text-xs"
          >
            <Download data-icon="inline-start" />
            Import from Upstox
          </Button>
          <Button
            size="sm"
            onClick={handleAddClick}
            className="rounded-none text-xs"
          >
            <Plus data-icon="inline-start" />
            Add IPO Manually
          </Button>
        </div>
      </div>

      {/* Quick Summary Strip (rendered when IPOs exist) */}
      {!loading && !fetchError && ipos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-0.5 border border-border/70 bg-card p-3">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Pipeline Active
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-bold text-foreground">
                {activeIpos.length}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({mainboardCount} MB • {smeCount} SME)
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 border border-border/70 bg-card p-3">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Open for Bidding
            </span>
            <div className="flex items-center gap-1.5">
              {openCount > 0 && (
                <span className="size-1.5 rounded-none bg-primary animate-pulse" />
              )}
              <span className="font-mono text-xl font-bold text-foreground">
                {openCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {upcomingCount > 0 ? `+ ${upcomingCount} upcoming` : "live now"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 border border-border/70 bg-card p-3">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Allotment Awaited
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-bold text-foreground">
                {allotmentPendingCount}
              </span>
              <span className="text-[11px] text-muted-foreground">
                issues pending
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 border border-border/70 bg-card p-3">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Total Applications
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-bold text-foreground">
                {applications.length}
              </span>
              <span className="text-[11px] text-muted-foreground">
                bids across accounts
              </span>
            </div>
          </div>
        </div>
      )}

      {fetchError ? (
        <Empty className="border border-border/70">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertTriangle className="size-6 text-destructive" />
            </EmptyMedia>
            <EmptyTitle>Failed to load data</EmptyTitle>
            <EmptyDescription>
              Something went wrong while loading your IPOs. Please check your
              connection and try again.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="sm"
              className="rounded-none"
              onClick={() => {
                setLoading(true)
                setFetchError(false)
                setFetchTrigger((prev) => prev + 1)
              }}
            >
              <RefreshCw data-icon="inline-start" className="size-3.5" />
              Retry
            </Button>
          </EmptyContent>
        </Empty>
      ) : loading ? (
        <IpoListSkeleton />
      ) : ipos.length === 0 ? (
        <Empty className="border border-border/70">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No IPOs tracked yet</EmptyTitle>
            <EmptyDescription>
              Import an upcoming or open IPO from Upstox, or manually add an IPO
              to begin recording multi-account applications and tracking allotments.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex flex-row items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none"
              onClick={() => setImportOpen(true)}
            >
              <Download data-icon="inline-start" />
              Import from Upstox
            </Button>
            <Button
              size="sm"
              className="rounded-none"
              onClick={handleAddClick}
            >
              <Plus data-icon="inline-start" />
              Add IPO Manually
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <IpoList
          ipos={ipos}
          applications={applications}
          userId={user?.uid || ""}
          onEdit={handleEditClick}
          onRefresh={reloadData}
        />
      )}

      {/* Add / Edit Dialog */}
      {user && (
        <>
          <IpoDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            userId={user.uid}
            ipoToEdit={ipoToEdit}
            onSuccess={handleSuccess}
          />
          <ImportIpoDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            userId={user.uid}
            existingIpos={ipos}
            onSuccess={() => {
              reloadData()
            }}
            onViewIpo={(ipoId) => {
              setImportOpen(false)
              router.push(`/ipos/${ipoId}`)
            }}
          />
        </>
      )}
    </div>
  )
}
