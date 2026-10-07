"use client"

import { useEffect } from "react"
import { usePageTitleContext } from "@/components/shared/page-title-context"

export function usePageTitle(
  title: string,
  options?: { breadcrumb?: string }
) {
  const context = usePageTitleContext()
  const breadcrumbText = options?.breadcrumb ?? title

  useEffect(() => {
    document.title = `${title} | IPOLOG`
    if (context) {
      context.setCustomTitle(breadcrumbText)
    }

    return () => {
      if (context) {
        context.setCustomTitle(null)
      }
    }
  }, [title, breadcrumbText, context])
}
