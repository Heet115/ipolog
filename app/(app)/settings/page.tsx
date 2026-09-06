"use client"

import * as React from "react"
import {
  User,
  KeyRound,
  ShieldCheck,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Shield,
} from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/lib/firebase/auth-context"
import type { User as FirebaseUser } from "firebase/auth"

interface ProfileCardProps {
  user: FirebaseUser
  updateDisplayName: (name: string) => Promise<void>
}

function ProfileCard({ user, updateDisplayName }: ProfileCardProps) {
  const initialName = user.displayName || user.email?.split("@")[0] || ""
  const [displayName, setDisplayName] = React.useState(initialName)
  const [savingName, setSavingName] = React.useState(false)

  const userInitial =
    (displayName || user.email || "U").charAt(0).toUpperCase()

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) {
      toast.add({
        title: "Name cannot be empty",
        description: "Please enter a valid display name.",
        type: "error",
      })
      return
    }

    setSavingName(true)
    try {
      await updateDisplayName(displayName.trim())
      toast.add({
        title: "Profile updated",
        description: "Your display name has been updated successfully.",
        type: "success",
      })
    } catch (err: unknown) {
      console.error("Failed to update profile name:", err)
      const msg =
        err instanceof Error ? err.message : "Failed to update profile name."
      toast.add({
        title: "Update failed",
        description: msg,
        type: "error",
      })
    } finally {
      setSavingName(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <div className="flex items-center gap-2">
          <User className="size-4 text-primary" />
          <CardTitle>Profile Details</CardTitle>
        </div>
        <CardDescription>
          Update your display name visible across application statements and reports
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleUpdateProfile}>
        <CardContent className="pt-4">
          <FieldGroup>
            {/* Avatar preview and basic info */}
            <div className="flex items-center gap-3 rounded-none border border-border/60 bg-muted/20 p-3">
              <Avatar className="size-12 rounded-full border border-border">
                <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">
                  {displayName || user.email?.split("@")[0] || "User"}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>

            <Field>
              <FieldLabel htmlFor="displayName">Display Name</FieldLabel>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Heet Patel"
                disabled={savingName}
                maxLength={60}
              />
              <FieldDescription>
                This name is displayed in the navigation sidebar, account filters, and generated settlement WhatsApp messages.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="accountEmail">Email Address</FieldLabel>
              <Input
                id="accountEmail"
                value={user.email || ""}
                readOnly
                disabled
                className="bg-muted/40 font-mono text-xs cursor-not-allowed"
              />
              <FieldDescription>
                Email address is permanently linked to your authentication provider.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 border-t pt-3">
          <Button
            type="submit"
            size="sm"
            disabled={
              savingName ||
              !displayName.trim() ||
              displayName.trim() === (user.displayName || "")
            }
          >
            {savingName ? (
              <>
                <Spinner className="mr-1.5 size-3.5" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

interface PasswordCardProps {
  user: FirebaseUser
  changePassword: (currentPass: string, newPass: string) => Promise<void>
}

function PasswordCard({ user, changePassword }: PasswordCardProps) {
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [savingPassword, setSavingPassword] = React.useState(false)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)

  const isPasswordProvider =
    user.providerData?.some((p) => p.providerId === "password") ||
    (!user.providerData?.length && !!user.email)

  const isGoogleProvider = user.providerData?.some(
    (p) => p.providerId === "google.com"
  )

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    if (!currentPassword) {
      setPasswordError("Please enter your current password.")
      return
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.")
      return
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from current password.")
      return
    }

    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.add({
        title: "Password updated",
        description: "Your account password has been changed successfully.",
        type: "success",
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: unknown) {
      console.error("Failed to change password:", err)
      const code = (err as { code?: string })?.code || ""
      let msg = "Failed to update password. Please check your credentials."

      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        msg = "Current password is incorrect. Please verify and try again."
      } else if (code === "auth/weak-password") {
        msg = "New password is too weak. Please use at least 6 characters."
      } else if (code === "auth/too-many-requests") {
        msg = "Too many failed attempts. Please wait a moment and try again."
      } else if (err instanceof Error) {
        msg = err.message
      }

      setPasswordError(msg)
      toast.add({
        title: "Password update failed",
        description: msg,
        type: "error",
      })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          <CardTitle>Security & Password</CardTitle>
        </div>
        <CardDescription>
          Manage your login password and authentication credentials
        </CardDescription>
      </CardHeader>

      {isPasswordProvider ? (
        <form onSubmit={handleChangePassword}>
          <CardContent className="pt-4">
            <FieldGroup>
              {passwordError && (
                <div
                  role="alert"
                  className="rounded-none border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive"
                >
                  {passwordError}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="current-password"
                />
                <FieldDescription>
                  Required for verification before changing your password.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="new-password"
                />
                <FieldDescription>
                  Must be at least 6 characters long.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="new-password"
                />
              </Field>
            </FieldGroup>
          </CardContent>

          <CardFooter className="flex justify-end gap-2 border-t pt-3">
            <Button
              type="submit"
              size="sm"
              disabled={
                savingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {savingPassword ? (
                <>
                  <Spinner className="mr-1.5 size-3.5" />
                  Updating Password...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </CardFooter>
        </form>
      ) : isGoogleProvider ? (
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 rounded-none border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" />
              <span className="text-xs font-semibold text-foreground">
                Google OAuth Account
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You are signed in via Google (<span className="font-mono text-foreground">{user.email}</span>). Password modifications, passkeys, and two-factor authentication are safely managed via your Google Account security center.
            </p>
            <div>
              <Button
                variant="outline"
                size="xs"
                render={
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <ExternalLink data-icon="inline-start" className="size-3.5" />
                Google Security Settings
              </Button>
            </div>
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}

export default function SettingsPage() {
  const { user, loading, updateDisplayName, changePassword } = useAuth()
  const [copiedUid, setCopiedUid] = React.useState(false)

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid)
      setCopiedUid(true)
      setTimeout(() => setCopiedUid(false), 2000)
    }
  }

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "N/A"
    try {
      return new Date(isoString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  const isGoogleProvider = user?.providerData?.some(
    (p) => p.providerId === "google.com"
  )

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage your personal profile information, credentials, and security preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Main Forms */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Profile Card with key for reactive reset if user changes */}
          <ProfileCard
            key={user.displayName || user.uid}
            user={user}
            updateDisplayName={updateDisplayName}
          />

          {/* Password / Security Card */}
          <PasswordCard user={user} changePassword={changePassword} />
        </div>

        {/* Right 1 Col: Account Overview & Metadata */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                <CardTitle>Account Overview</CardTitle>
              </div>
              <CardDescription>
                Overview of account status and authentication provider
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-4 text-xs">
                {/* Auth Provider */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <span className="text-muted-foreground">Sign-in Method</span>
                  {isGoogleProvider ? (
                    <Badge variant="outline" className="gap-1 text-[11px]">
                      <ShieldCheck className="size-3 text-success" />
                      Google OAuth
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-[11px]">
                      <Mail className="size-3" />
                      Email & Password
                    </Badge>
                  )}
                </div>

                {/* Email Verification */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <span className="text-muted-foreground">Email Status</span>
                  {user.emailVerified ? (
                    <Badge variant="success" className="text-[11px]">
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[11px]">
                      Unverified
                    </Badge>
                  )}
                </div>

                {/* Account Created */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <span className="text-muted-foreground">Member Since</span>
                  <span className="font-mono text-foreground">
                    {formatDate(user.metadata?.creationTime)}
                  </span>
                </div>

                {/* Last Sign In */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <span className="text-muted-foreground">Last Sign In</span>
                  <span className="font-mono text-foreground">
                    {formatDate(user.metadata?.lastSignInTime)}
                  </span>
                </div>

                {/* User ID */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-muted-foreground">User Identifier (UID)</span>
                  <div className="flex items-center justify-between rounded-none border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] text-foreground">
                    <span className="truncate pr-2">{user.uid}</span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={handleCopyUid}
                      title="Copy UID"
                      className="shrink-0 size-5"
                    >
                      {copiedUid ? (
                        <Check className="size-3 text-success" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
