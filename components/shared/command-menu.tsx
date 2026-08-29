"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Users,
  Landmark,
  Plus,
  Search,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/firebase/auth-context"
import { getIpos } from "@/lib/firebase/ipos"
import type { Ipo } from "@/types"

export function CommandMenu() {
  const router = useRouter()
  const { user } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [ipos, setIpos] = React.useState<Ipo[]>([])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (!user || !open) return
    getIpos(user.uid, false).then(setIpos).catch(console.error)
  }, [user, open])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="relative h-8 w-full max-w-[180px] justify-start bg-background text-xs text-muted-foreground sm:w-56"
      >
        <Search className="mr-2 size-3.5" />
        <span className="truncate">Search IPOs, pages...</span>
        <kbd className="pointer-events-none absolute top-1.5 right-1.5 hidden h-5 items-center gap-1 rounded-none border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search IPOs..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Quick Pages */}
          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/dashboard"))}
            >
              <LayoutDashboard className="mr-2 size-4 text-muted-foreground" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/ipos"))}
            >
              <FileText className="mr-2 size-4 text-muted-foreground" />
              <span>My IPOs</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/accounts"))}
            >
              <Users className="mr-2 size-4 text-muted-foreground" />
              <span>Application Accounts</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/bank-accounts"))}
            >
              <Landmark className="mr-2 size-4 text-muted-foreground" />
              <span>Bank Accounts</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/ipos"))}
            >
              <Plus className="mr-2 size-4 text-muted-foreground" />
              <span>Add New IPO</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/accounts"))}
            >
              <Plus className="mr-2 size-4 text-muted-foreground" />
              <span>Add Application Account</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/bank-accounts"))}
            >
              <Plus className="mr-2 size-4 text-muted-foreground" />
              <span>Add Bank Account</span>
            </CommandItem>
          </CommandGroup>

          {/* Tracked IPOs */}
          {ipos.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tracked IPOs">
                {ipos.map((ipo) => (
                  <CommandItem
                    key={ipo.id}
                    onSelect={() =>
                      runCommand(() => router.push(`/ipos/${ipo.id}`))
                    }
                  >
                    <FileText className="mr-2 size-4 text-muted-foreground" />
                    <span className="font-medium">{ipo.name}</span>
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground uppercase">
                      ({ipo.type})
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
