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
} from "lucide-react"

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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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

const navItems = [
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
    title: "Application Accounts",
    url: "/accounts",
    icon: Users,
  },
  {
    title: "Bank Accounts",
    url: "/bank-accounts",
    icon: Landmark,
  },
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
        {/* Sidebar Header: Brand & Workspace */}
        <SidebarHeader className="border-b border-sidebar-border/60 p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link href="/dashboard" onClick={handleNavClick} />}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                tooltip="IPOLOG Dashboard"
              >
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-none bg-foreground text-background shadow-xs">
                  <TrendingUp className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-heading text-sm font-black tracking-tight text-foreground">
                    IPOLOG
                  </span>
                  <span className="truncate font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
                    Portfolio Manager
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Sidebar Content: Platform Navigation */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    (item.url !== "/dashboard" && pathname.startsWith(item.url))

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={<Link href={item.url} onClick={handleNavClick} />}
                      >
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Sidebar Footer: User Profile & Menu */}
        <SidebarFooter className="border-t border-sidebar-border/60 p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                      tooltip={userName}
                    />
                  }
                >
                  <Avatar className="size-7 shrink-0 rounded-full border border-sidebar-border">
                    <AvatarFallback className="bg-muted text-[10px] font-bold text-foreground">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-xs leading-tight">
                    <span className="truncate font-semibold text-foreground">
                      {userName}
                    </span>
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="w-56 text-xs"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={6}
                >
                  <div className="flex items-center gap-2 p-2 text-left text-xs">
                    <Avatar className="size-7 shrink-0 rounded-full border border-border">
                      <AvatarFallback className="bg-muted text-[10px] font-bold text-foreground">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-semibold text-foreground">
                        {userName}
                      </span>
                      <span className="truncate font-mono text-[10px] text-muted-foreground">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem render={<Link href="/accounts" onClick={handleNavClick} />}>
                      <UserCheck data-icon="inline-start" />
                      Manage Accounts
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/bank-accounts" onClick={handleNavClick} />}>
                      <Building2 data-icon="inline-start" />
                      Bank ASBA Limits
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/settings" onClick={handleNavClick} />}>
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

        {/* Sidebar Rail: hover/drag edge handle */}
        <SidebarRail />
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
