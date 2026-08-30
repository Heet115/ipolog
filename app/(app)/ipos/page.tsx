"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import type { Ipo, Application } from "@/types"

export default function IposPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [ipos, setIpos] = useState<Ipo[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [ipoToEdit, setIpoToEdit] = useState<Ipo | null>(null)

  const reloadData = useCallback(async () => {
    if (!user) return
    try {
      const [iposData, appsData] = await Promise.all([
        getIpos(user.uid, true),
        getApplications(user.uid),
      ])
      setIpos(iposData)
      setApplications(appsData)
    } catch (err) {
      console.error("Failed to load IPOs and applications:", err)
    }
  }, [user])

  useEffect(() => {
    let ignore = false
    if (!user) return

    Promise.all([getIpos(user.uid, true), getApplications(user.uid)])
      .then(([iposData, appsData]) => {
        if (!ignore) {
          setIpos(iposData)
          setApplications(appsData)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load IPOs:", err)
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user])

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">My IPOs</h1>
          <p className="text-xs text-muted-foreground">
            Track and manage IPO applications, allotments, and market
            performance
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
          >
            <Download data-icon="inline-start" />
            Import from Upstox
          </Button>
          <Button size="sm" onClick={handleAddClick}>
            <Plus data-icon="inline-start" />
            Add IPO Manually
          </Button>
        </div>
      </div>

      {loading ? (
        <IpoListSkeleton />
      ) : ipos.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No IPOs tracked yet</EmptyTitle>
            <EmptyDescription>
              Import an upcoming or open IPO from Upstox, or manually add an IPO
              to begin recording applications.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex flex-row justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Download data-icon="inline-start" />
              Import from Upstox
            </Button>
            <Button size="sm" onClick={handleAddClick}>
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
