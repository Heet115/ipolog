"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Users,
  Landmark,
  ChevronLeft,
  ChevronRight,
  LogOut,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/lib/firebase/auth-context"

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My IPOs",
    href: "/ipos",
    icon: FileText,
  },
  {
    label: "Application Accounts",
    href: "/accounts",
    icon: Users,
  },
  {
    label: "Bank Accounts",
    href: "/bank-accounts",
    icon: Landmark,
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  const userInitial = user?.email?.charAt(0).toUpperCase() ?? "U"

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "sticky top-0 z-20 flex h-svh shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Top Section */}
        <div className="flex flex-col">
          {/* Logo / Brand Header */}
          <div
            className={cn(
              "flex h-14 items-center border-b border-sidebar-border px-4",
              collapsed ? "justify-center px-0" : "justify-between"
            )}
          >
            {!collapsed ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 font-bold tracking-tight text-sidebar-foreground"
              >
                <div className="flex size-7 items-center justify-center rounded-none bg-foreground text-background">
                  <TrendingUp className="size-4" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-sm font-black tracking-tight">
                    IPOLOG
                  </span>
                  <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                    Manager
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="flex size-8 items-center justify-center rounded-none bg-foreground text-background"
                title="IPOLOG"
              >
                <TrendingUp className="size-4" />
              </Link>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 p-2.5">
            {!collapsed && (
              <span className="px-2 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Platform
              </span>
            )}
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href))

              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-none px-2.5 py-2 text-xs font-medium transition-all",
                    isActive
                      ? "-ml-[1px] border-l-2 border-foreground bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    collapsed && "justify-center border-l-0 px-0 py-2"
                  )}
                >
                  <item.icon className="size-4 shrink-0 transition-transform group-hover:scale-105" />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger render={<span />}>{link}</TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="text-xs font-medium"
                    >
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return link
            })}
          </nav>
        </div>

        {/* Bottom Section: Profile & Collapse Toggle */}
        <div className="flex flex-col gap-2 border-t border-sidebar-border p-2.5">
          {!collapsed && user && (
            <div className="flex items-center justify-between rounded-none border border-sidebar-border bg-sidebar-accent/40 p-2">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar className="size-6 shrink-0">
                  <AvatarFallback className="bg-muted text-[10px] font-bold text-foreground">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium text-foreground">
                    {user.displayName || "My Account"}
                  </span>
                  <span className="truncate font-mono text-[10px] text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setConfirmSignOut(true)}
                className="text-muted-foreground hover:text-destructive"
                title="Sign out"
              >
                <LogOut className="size-3.5" />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
          )}

          {/* Collapse Sidebar Button */}
          <Button
            variant="ghost"
            size="xs"
            onClick={onToggle}
            className={cn(
              "w-full text-xs text-muted-foreground hover:text-foreground",
              collapsed ? "justify-center px-0" : "justify-between px-2.5"
            )}
          >
            {!collapsed && <span>Collapse Sidebar</span>}
            {collapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronLeft className="size-3.5" />
            )}
          </Button>
        </div>
      </aside>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of IPOLOG?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account? You will need
              to sign back in to access your data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => signOut()}>
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}

export function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const userInitial = user?.email?.charAt(0).toUpperCase() ?? "U"

  return (
    <>
      <div className="flex h-full flex-col justify-between bg-sidebar p-3 text-sidebar-foreground">
        <div className="flex flex-col gap-1">
          <span className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Platform
          </span>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-none px-3 py-2.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-l-2 border-foreground bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {user && (
          <div className="flex flex-col gap-2 border-t border-sidebar-border pt-3">
            <div className="flex items-center gap-2.5 px-2 py-1">
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="bg-muted text-xs font-bold text-foreground">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium text-foreground">
                  {user.displayName || "My Account"}
                </span>
                <span className="truncate font-mono text-[10px] text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmSignOut(true)}
              className="w-full border-destructive/20 text-xs text-destructive hover:bg-destructive/10"
            >
              <LogOut data-icon="inline-start" />
              Sign Out
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Sign Out Confirmation Dialog */}
      <AlertDialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of IPOLOG?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                signOut()
                onNavigate()
              }}
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
