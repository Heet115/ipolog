"use client"

import * as React from "react"
import { Check, Loader2, Mail } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import type { User } from "firebase/auth"

interface ProfileCardProps {
  user: User | null
  updateDisplayName: (name: string) => Promise<void>
}

export function ProfileCard({ user, updateDisplayName }: ProfileCardProps) {
  const initialName =
    user?.displayName || (user?.email ? user.email.split("@")[0] : "")
  const [customName, setCustomName] = React.useState<string | null>(null)
  const displayName = customName ?? initialName
  const [isSavingProfile, setIsSavingProfile] = React.useState(false)

  const userInitial = (displayName || user?.email || "U")
    .charAt(0)
    .toUpperCase()

  const isGoogleProvider =
    user?.providerData.some((p) => p.providerId === "google.com") ?? false

  const hasNameChanged =
    customName !== null &&
    customName.trim() !== (user?.displayName ?? "") &&
    customName.trim().length > 0

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = displayName.trim()
    if (!trimmed) {
      toast.add({
        title: "Invalid name",
        description: "Display name cannot be empty.",
        type: "error",
      })
      return
    }

    setIsSavingProfile(true)
    try {
      await updateDisplayName(trimmed)
      setCustomName(null)
      toast.add({
        title: "Profile updated",
        description: "Your display name has been updated successfully.",
        type: "success",
      })
    } catch (err: unknown) {
      console.error("Failed to update display name:", err)
      const message =
        err instanceof Error ? err.message : "Failed to update profile."
      toast.add({
        title: "Update failed",
        description: message,
        type: "error",
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSaveProfile}>
        <CardHeader>
          <CardTitle>Personal Profile</CardTitle>
          <CardDescription className="pb-4">
            Update your display name and review your account details.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Avatar & Email preview */}
          <div className="flex items-center gap-4">
            <Avatar className="size-14 shrink-0 rounded-none border border-border">
              <AvatarFallback className="rounded-none bg-primary/10 text-base font-bold text-primary">
                {userInitial}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {displayName || "Unnamed User"}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {isGoogleProvider ? "Google Account" : "Email Account"}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="size-3.5 shrink-0" />
                <span className="font-mono text-[11px]">{user?.email}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Display Name Field */}
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="display-name">Display Name</FieldLabel>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter your name"
                disabled={isSavingProfile}
                className="max-w-md"
              />
              <FieldDescription className="pb-2">
                This name is shown in the sidebar navigation, header, and
                generated settlement ledgers.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border/60 bg-muted/20 py-3">
          <span className="text-[11px] text-muted-foreground">
            {hasNameChanged ? "Unsaved changes" : "All changes saved"}
          </span>
          <Button
            type="submit"
            size="xs"
            disabled={isSavingProfile || !hasNameChanged || !displayName.trim()}
          >
            {isSavingProfile ? (
              <>
                <Loader2
                  data-icon="inline-start"
                  className="size-3.5 animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                <Check data-icon="inline-start" className="size-3.5" />
                Save Name
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
