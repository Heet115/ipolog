"use client"

import * as React from "react"
import { KeyRound, ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react"
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/toast"
import type { User } from "firebase/auth"

interface PasswordCardProps {
  user: User | null
  changePassword: (current: string, newPass: string) => Promise<void>
}

export function PasswordCard({ user, changePassword }: PasswordCardProps) {
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)

  const isPasswordProvider =
    user?.providerData.some((p) => p.providerId === "password") ?? false
  const isGoogleProvider =
    user?.providerData.some((p) => p.providerId === "google.com") ?? false

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword
  const hasPasswordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword

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
      let message =
        "Failed to update password. Please verify your current password."
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

  return (
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
              Your account is secured with Google OAuth. Your password and
              two-factor authentication are managed directly inside your
              Google Account security dashboard.
            </AlertDescription>
          </Alert>
        </CardContent>
      ) : (
        <form onSubmit={handleChangePassword}>
          <CardContent className="flex flex-col gap-4">
            <FieldGroup className="gap-4 pb-2">
              {/* Current Password */}
              <Field>
                <FieldLabel htmlFor="current-password">
                  Current Password
                </FieldLabel>
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
                      onClick={() =>
                        setShowCurrentPassword((prev) => !prev)
                      }
                      aria-label={
                        showCurrentPassword
                          ? "Hide password"
                          : "Show password"
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
                  Must be at least 6 characters with a combination of letters
                  and numbers.
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
                      onClick={() =>
                        setShowConfirmPassword((prev) => !prev)
                      }
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
  )
}
