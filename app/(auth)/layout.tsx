import * as React from "react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6 md:p-8">
      {/* Ambient gradient mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 left-1/2 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-chart-2/8 blur-3xl dark:bg-chart-2/10"
      />

      {/* Main card viewport */}
      <div className="animate-fade-in relative z-10 w-full max-w-md">
        {children}
      </div>

      {/* Subtle branding footer */}
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p className="font-medium tracking-wide">
          <span className="font-bold text-foreground">IPOLOG</span> &bull;
          Indian IPO Portfolio & Multi-Account Manager
        </p>
      </footer>
    </div>
  )
}
