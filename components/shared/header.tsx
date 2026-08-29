"use client"

import { useState } from "react"
import { Menu, LogOut, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MobileNav } from "@/components/shared/sidebar"
import { useAuth } from "@/lib/firebase/auth-context"

export function Header() {
  const { user, signOut } = useAuth()
  const [sheetOpen, setSheetOpen] = useState(false)

  const userInitial = user?.email?.charAt(0).toUpperCase() ?? "U"

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      {/* Mobile menu trigger */}
      <div className="flex items-center gap-2">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="md:hidden" />
            }
          >
            <Menu className="size-5" />
            <span className="sr-only">Open navigation</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b px-4 py-4">
              <SheetTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-5 text-primary" />
                IPO Tracker
              </SheetTitle>
            </SheetHeader>
            <MobileNav onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" className="rounded-full" />
          }
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {user?.email && (
            <>
              <div className="px-2 py-1.5">
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
