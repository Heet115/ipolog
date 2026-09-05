"use client"

import { useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/firebase/auth-context"
import { toast } from "@/components/ui/toast"

const AUTO_REFRESH_CHECK_KEY = "ipolog_last_auto_refresh_check"
const CHECK_INTERVAL_MS = 30 * 60 * 1000 // Check at most once every 30 minutes per browser session

export function AutoRefreshProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const isRefreshingRef = useRef(false)

  const checkAndAutoRefresh = useCallback(
    async (force = false) => {
      if (!user || isRefreshingRef.current) return

      try {
        const lastCheckStr = sessionStorage.getItem(AUTO_REFRESH_CHECK_KEY)
        const lastCheck = lastCheckStr ? Number(lastCheckStr) : 0
        const now = Date.now()

        // Rate-limit checks unless forced
        if (!force && now - lastCheck < CHECK_INTERVAL_MS) {
          return
        }

        isRefreshingRef.current = true
        sessionStorage.setItem(AUTO_REFRESH_CHECK_KEY, String(now))

        const token = await user.getIdToken()
        const res = await fetch("/api/ipos/auto-refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ maxAgeHours: 24 }),
        })

        if (!res.ok) return
        const data = await res.json()

        if (data.success && data.refreshedCount > 0) {
          toast.add({
            title: "IPO Data Refreshed",
            description: `Auto-updated ${data.refreshedCount} imported IPO(s) with latest 24h market & allotment data.`,
            type: "success",
          })
          window.dispatchEvent(
            new CustomEvent("ipos-auto-refreshed", { detail: data })
          )
        }
      } catch (err) {
        // Fail silently in the background
        console.warn("Background auto-refresh check skipped:", err)
      } finally {
        isRefreshingRef.current = false
      }
    },
    [user]
  )

  useEffect(() => {
    if (!user) return

    // Trigger on initial mount with slight delay
    const initialTimer = setTimeout(() => {
      checkAndAutoRefresh()
    }, 2000)

    // Trigger on window visibility / tab return
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndAutoRefresh()
      }
    }

    // Interval ticker every 30 mins
    const intervalTimer = setInterval(() => {
      checkAndAutoRefresh()
    }, CHECK_INTERVAL_MS)

    window.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(intervalTimer)
      window.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [user, checkAndAutoRefresh])

  return <>{children}</>
}
