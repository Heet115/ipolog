"use client"

import * as React from "react"
import { ShieldCheck, Check, Copy, Calendar, Clock } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import type { User } from "firebase/auth"

interface AccountMetadataCardProps {
  user: User | null
}

function formatDate(isoString?: string | null) {
  if (!isoString) return "N/A"
  try {
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return isoString
  }
}

export function AccountMetadataCard({ user }: AccountMetadataCardProps) {
  const [copiedUid, setCopiedUid] = React.useState(false)

  const isGoogleProvider =
    user?.providerData.some((p) => p.providerId === "google.com") ?? false

  const handleCopyUid = () => {
    if (!user?.uid) return
    navigator.clipboard.writeText(user.uid)
    setCopiedUid(true)
    toast.add({
      title: "Copied to clipboard",
      description: "User ID copied successfully.",
      type: "success",
    })
    setTimeout(() => setCopiedUid(false), 2000)
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Account Details</CardTitle>
        <CardDescription>
          Technical information and session identifiers for this account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-none border border-border/70 p-2.5">
            <span className="text-[11px] text-muted-foreground">
              Account UID
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[11px] text-foreground">
                {user?.uid || "N/A"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleCopyUid}
                title="Copy UID"
              >
                {copiedUid ? (
                  <Check className="size-3 text-success" />
                ) : (
                  <Copy className="size-3 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-none border border-border/70 p-2.5">
            <span className="text-[11px] text-muted-foreground">
              Auth Provider
            </span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <ShieldCheck className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {isGoogleProvider ? "Google (OAuth)" : "Email & Password"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-none border border-border/70 p-2.5">
            <span className="text-[11px] text-muted-foreground">
              Joined On
            </span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span className="font-mono text-[11px] text-foreground">
                {formatDate(user?.metadata.creationTime)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-none border border-border/70 p-2.5">
            <span className="text-[11px] text-muted-foreground">
              Last Sign In
            </span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <Clock className="size-3.5 text-muted-foreground" />
              <span className="font-mono text-[11px] text-foreground">
                {formatDate(user?.metadata.lastSignInTime)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
