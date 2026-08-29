"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/lib/firebase/auth-context"
import { getAuthErrorMessage } from "@/lib/firebase/auth-errors"

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth()

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError("Please enter your email address.")
      return
    }

    setError(null)
    setLoading(true)

    try {
      await sendPasswordReset(email.trim())
      setSubmitted(true)
      toast.add({
        title: "Password reset link sent",
        description: `Check your inbox at ${email}`,
        type: "success",
      })
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || ""
      const message = getAuthErrorMessage(code)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full rounded-none border border-border/80 bg-card">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-none border border-border bg-muted/40 text-sm font-black tracking-tighter text-foreground">
          IPO
        </div>
        <CardTitle className="text-lg font-bold">Reset your password</CardTitle>
        <CardDescription className="text-xs">
          Enter your email address and we will send you a link to reset your
          password
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {submitted ? (
          <div className="flex flex-col gap-4 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-none border border-border bg-muted/30 text-success">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-foreground">
                Email sent successfully
              </p>
              <p className="text-xs text-muted-foreground">
                We sent a password reset link to{" "}
                <strong className="text-foreground">{email}</strong>. Please
                check your spam folder if you do not see it.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => setSubmitted(false)}
            >
              Send again
            </Button>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-primary underline-offset-4 hover:underline"
              >
                <ArrowLeft />
                Back to Sign in
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="email"
                  />
                </Field>
              </FieldGroup>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Spinner data-icon="inline-start" />}
                {loading ? "Sending link..." : "Send Reset Link"}
              </Button>
            </form>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft />
                Back to Sign in
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
