"use client"

import { useAuth } from "@/lib/firebase/auth-context"
import { ProfileCard } from "@/components/settings/profile-card"
import { PasswordCard } from "@/components/settings/password-card"
import { AccountMetadataCard } from "@/components/settings/account-metadata-card"
import { usePageTitle } from "@/hooks/use-page-title"

export default function SettingsPage() {
  usePageTitle("Settings")
  const { user, updateDisplayName, changePassword } = useAuth()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage your personal profile, display name, and login security
          credentials.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Section 1: Personal Profile */}
        <ProfileCard user={user} updateDisplayName={updateDisplayName} />

        {/* Section 2: Security & Password */}
        <PasswordCard user={user} changePassword={changePassword} />

        {/* Section 3: Account Metadata */}
        <AccountMetadataCard user={user} />
      </div>
    </div>
  )
}
