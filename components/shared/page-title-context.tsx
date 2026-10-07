"use client"

import * as React from "react"

interface PageTitleContextValue {
  customTitle: string | null
  setCustomTitle: (title: string | null) => void
}

const PageTitleContext = React.createContext<PageTitleContextValue | undefined>(
  undefined
)

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [customTitle, setCustomTitle] = React.useState<string | null>(null)

  return (
    <PageTitleContext.Provider value={{ customTitle, setCustomTitle }}>
      {children}
    </PageTitleContext.Provider>
  )
}

export function usePageTitleContext() {
  return React.useContext(PageTitleContext)
}
