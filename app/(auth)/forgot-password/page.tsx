"use client"

import { useState } from "react"
import Link from "next/link"
import { FileText, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="size-5" />
        </div>
        <CardTitle className="text-lg">Reset your password</CardTitle>
        <CardDescription className="text-xs">
          Enter your email address and we will send you a link to reset your
          password
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">
                Email sent successfully
              </p>
              <p className="text-xs text-muted-foreground">
                We sent a password reset link to{" "}
                <strong className="text-foreground">{email}</strong>. Please check
                your spam folder if you do not see it.
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
                <ArrowLeft className="size-3" />
                Back to Sign in
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-foreground"
                >
                  Email
                </label>
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
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3" />
                Back to Sign in
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
