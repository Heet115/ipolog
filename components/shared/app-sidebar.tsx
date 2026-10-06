"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Layers,
  Users,
  Landmark,
  TrendingUp,
  LogOut,
  ChevronsUpDown,
  UserCheck,
  Building2,
  Settings,
  FileText,
} from "lucide-react"

import { cn } from "@/lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

const platformNav = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My IPOs",
    url: "/ipos",
    icon: Layers,
  },
  {
    title: "Applications",
    url: "/applications",
    icon: FileText,
  },
]

const managementNav = [
  {
    title: "Accounts",
    url: "/accounts",
    icon: Users,
  },
  {
    title: "Bank & ASBA",
    url: "/bank-accounts",
    icon: Landmark,
  },
]

const secondaryNav = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()
  const [confirmSignOut, setConfirmSignOut] = React.useState(false)

  const userInitial = user?.email?.charAt(0).toUpperCase() ?? "U"
  const userName = user?.displayName || user?.email?.split("@")[0] || "Manager"

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <>
      <Sidebar collapsible="icon" variant="inset" {...props}>
        {/* Workspace Brand Switcher */}
        <SidebarHeader className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link href="/dashboard" onClick={handleNavClick} />}
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                tooltip="IPOLOG Dashboard"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-none bg-primary text-primary-foreground shadow-xs shadow-primary/25">
                  <TrendingUp className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold tracking-tight text-foreground">
                    IPOLOG
                  </span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    Portfolio Manager
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Navigation Groups */}
        <SidebarContent>
          {/* Platform Group */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Platform
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {platformNav.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    (item.url !== "/dashboard" && pathname.startsWith(item.url))

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "transition-colors duration-150",
                          isActive && "font-semibold"
                        )}
                        render={
                          <Link href={item.url} onClick={handleNavClick} />
                        }
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Management Group */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementNav.map((item) => {
                  const isActive =
                    pathname === item.url || pathname.startsWith(item.url)

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "transition-colors duration-150",
                          isActive && "font-semibold"
                        )}
                        render={
                          <Link href={item.url} onClick={handleNavClick} />
                        }
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Preferences Group (pinned to bottom) */}
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Preferences
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryNav.map((item) => {
                  const isActive = pathname === item.url

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "transition-colors duration-150",
                          isActive && "font-semibold"
                        )}
                        render={
                          <Link href={item.url} onClick={handleNavClick} />
                        }
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* User Profile Footer */}
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                      tooltip={userName}
                    />
                  }
                >
                  <Avatar className="size-8 rounded-none border border-sidebar-border">
                    <AvatarFallback className="rounded-none bg-primary/10 text-xs font-bold text-primary">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-foreground">
                      {userName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="w-56 rounded-none border border-border p-1 text-xs shadow-lg"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2.5 px-1 py-1.5 text-left text-sm">
                        <Avatar className="size-8 rounded-none border border-border">
                          <AvatarFallback className="rounded-none bg-primary/10 text-xs font-bold text-primary">
                            {userInitial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left leading-tight">
                          <span className="truncate font-semibold text-foreground">
                            {userName}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {user?.email}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      render={
                        <Link href="/accounts" onClick={handleNavClick} />
                      }
                    >
                      <UserCheck data-icon="inline-start" />
                      Manage Accounts
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      render={
                        <Link href="/bank-accounts" onClick={handleNavClick} />
                      }
                    >
                      <Building2 data-icon="inline-start" />
                      Bank ASBA Limits
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      render={
                        <Link href="/settings" onClick={handleNavClick} />
                      }
                    >
                      <Settings data-icon="inline-start" />
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setConfirmSignOut(true)}
                    >
                      <LogOut data-icon="inline-start" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Sign Out Confirmation Alert Dialog */}
      <AlertDialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of IPOLOG?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account? You will need
              to sign back in to access your portfolios and records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmSignOut(false)
                signOut()
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
