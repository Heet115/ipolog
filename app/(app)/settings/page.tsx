"use client"

import * as React from "react"
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Copy,
  Mail,
  Calendar,
  Clock,
} from "lucide-react"

import { useAuth } from "@/lib/firebase/auth-context"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/toast"

export default function SettingsPage() {
  const { user, updateDisplayName, changePassword } = useAuth()

  // Profile Form State
  const initialName =
    user?.displayName || (user?.email ? user.email.split("@")[0] : "")
  const [customName, setCustomName] = React.useState<string | null>(null)
  const displayName = customName ?? initialName
  const [isSavingProfile, setIsSavingProfile] = React.useState(false)

  // Password Form State
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)

  // Copy UID State
  const [copiedUid, setCopiedUid] = React.useState(false)

  const userInitial =
    (displayName || user?.email || "U").charAt(0).toUpperCase()

  const isPasswordProvider =
    user?.providerData.some((p) => p.providerId === "password") ?? false
  const isGoogleProvider =
    user?.providerData.some((p) => p.providerId === "google.com") ?? false

  const hasNameChanged =
    customName !== null &&
    customName.trim() !== (user?.displayName ?? "") &&
    customName.trim().length > 0

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword
  const hasPasswordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword

  // Handle Display Name Update
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

  // Handle Password Update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      toast.add({
        title: "Current password required",
        description: "Please enter your current password to verify.",
        type: "error",
      })
      return
    }

    if (newPassword.length < 6) {
      toast.add({
        title: "Weak password",
        description: "New password must be at least 6 characters long.",
        type: "error",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast.add({
        title: "Passwords do not match",
        description: "New password and confirmation do not match.",
        type: "error",
      })
      return
    }

    setIsChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.add({
        title: "Password updated",
        description: "Your password has been changed successfully.",
        type: "success",
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: unknown) {
      console.error("Failed to change password:", err)
      let message = "Failed to update password. Please verify your current password."
      if (err instanceof Error) {
        if (
          err.message.includes("auth/invalid-credential") ||
          err.message.includes("auth/wrong-password")
        ) {
          message = "Current password is incorrect. Please try again."
        } else if (err.message.includes("auth/weak-password")) {
          message = "Password must be at least 6 characters long."
        } else if (err.message.includes("auth/too-many-requests")) {
          message = "Too many failed attempts. Please try again later."
        } else {
          message = err.message
        }
      }
      toast.add({
        title: "Password change failed",
        description: message,
        type: "error",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

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

  const formatDate = (isoString?: string | null) => {
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage your personal profile, display name, and login security credentials.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Section 1: Personal Profile */}
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
                <Avatar className="size-14 shrink-0 rounded-full border border-border">
                  <AvatarFallback className="bg-muted text-base font-bold text-foreground">
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
                    This name is shown in the sidebar navigation, header, and generated
                    settlement ledgers.
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
                    <Loader2 data-icon="inline-start" className="size-3.5 animate-spin" />
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

        {/* Section 2: Security & Password */}
        <Card>
          <CardHeader>
            <CardTitle>Security & Password</CardTitle>
            <CardDescription>
              Ensure your account stays protected by using a strong password.
            </CardDescription>
          </CardHeader>

          {isGoogleProvider && !isPasswordProvider ? (
            <CardContent>
              <Alert>
                <ShieldCheck className="size-4 text-primary" />
                <AlertTitle>Authenticated via Google Single Sign-On</AlertTitle>
                <AlertDescription>
                  Your account is secured with Google OAuth. Your password and two-factor
                  authentication are managed directly inside your Google Account
                  security dashboard.
                </AlertDescription>
              </Alert>
            </CardContent>
          ) : (
            <form onSubmit={handleChangePassword}>
              <CardContent className="flex flex-col gap-4">
                <FieldGroup className="gap-4 pb-2">
                  {/* Current Password */}
                  <Field>
                    <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
                    <InputGroup className="max-w-md">
                      <InputGroupInput
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={isChangingPassword}
                        autoComplete="current-password"
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-xs"
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          aria-label={
                            showCurrentPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldDescription>
                      Enter your current password to verify your identity.
                    </FieldDescription>
                  </Field>

                  {/* New Password */}
                  <Field>
                    <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                    <InputGroup className="max-w-md">
                      <InputGroupInput
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={isChangingPassword}
                        autoComplete="new-password"
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-xs"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          aria-label={
                            showNewPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldDescription>
                      Must be at least 6 characters with a combination of letters and
                      numbers.
                    </FieldDescription>
                  </Field>

                  {/* Confirm New Password */}
                  <Field data-invalid={hasPasswordMismatch}>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm New Password
                    </FieldLabel>
                    <InputGroup className="max-w-md">
                      <InputGroupInput
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={isChangingPassword}
                        autoComplete="new-password"
                        aria-invalid={hasPasswordMismatch}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-xs"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    {hasPasswordMismatch ? (
                      <FieldError>Passwords do not match.</FieldError>
                    ) : passwordsMatch ? (
                      <FieldDescription className="text-success">
                        Passwords match.
                      </FieldDescription>
                    ) : (
                      <FieldDescription>
                        Re-type the new password to confirm.
                      </FieldDescription>
                    )}
                  </Field>
                </FieldGroup>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-border/60 bg-muted/20 py-3">
                <span className="text-[11px] text-muted-foreground">
                  Credentials are encrypted using Firebase Auth
                </span>
                <Button
                  type="submit"
                  size="xs"
                  disabled={
                    isChangingPassword ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword.length < 6 ||
                    newPassword !== confirmPassword
                  }
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2
                        data-icon="inline-start"
                        className="size-3.5 animate-spin"
                      />
                      Updating...
                    </>
                  ) : (
                    <>
                      <KeyRound data-icon="inline-start" className="size-3.5" />
                      Update Password
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        {/* Section 3: Account Metadata */}
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
                <span className="text-[11px] text-muted-foreground">Account UID</span>
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
                <span className="text-[11px] text-muted-foreground">Auth Provider</span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {isGoogleProvider ? "Google (OAuth)" : "Email & Password"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 rounded-none border border-border/70 p-2.5">
                <span className="text-[11px] text-muted-foreground">Joined On</span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span className="font-mono text-[11px] text-foreground">
                    {formatDate(user?.metadata.creationTime)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 rounded-none border border-border/70 p-2.5">
                <span className="text-[11px] text-muted-foreground">Last Sign In</span>
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
      </div>
    </div>
  )
}
