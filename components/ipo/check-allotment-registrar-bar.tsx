"use client"

import { Building2, ExternalLink, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  KNOWN_REGISTRARS,
  BSE_ALLOTMENT_URL,
  type RegistrarInfo,
} from "@/lib/utils/registrars"

interface CheckAllotmentRegistrarBarProps {
  selectedRegistrar: string
  activeRegistrarMeta?: RegistrarInfo
  portalUrl: string | null
  onSaveRegistrar: (registrarName: string) => void
}

export function CheckAllotmentRegistrarBar({
  selectedRegistrar,
  activeRegistrarMeta,
  portalUrl,
  onSaveRegistrar,
}: CheckAllotmentRegistrarBarProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-none border border-border/70 bg-muted/20 p-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-none border border-border/80 bg-background text-primary">
          <Building2 className="size-3.5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Registrar:
            </span>
            <span className="truncate text-xs font-bold text-foreground">
              {selectedRegistrar || "Not Specified"}
            </span>
            {activeRegistrarMeta && (
              <Badge
                variant="outline"
                className="px-1 py-0 text-[9px] font-normal"
              >
                Modes:{" "}
                {activeRegistrarMeta.searchModes
                  .map((m) => m.toUpperCase())
                  .join(" / ")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        <Select
          value={activeRegistrarMeta?.id || ""}
          onValueChange={(val) => {
            const found = KNOWN_REGISTRARS.find((r) => r.id === val)
            if (found) onSaveRegistrar(found.name)
          }}
        >
          <SelectTrigger className="h-7 w-36 bg-background text-xs font-normal">
            <SelectValue placeholder="Change Registrar">
              {activeRegistrarMeta
                ? activeRegistrarMeta.name
                : selectedRegistrar || "Select Registrar"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {KNOWN_REGISTRARS.map((reg) => (
                <SelectItem key={reg.id} value={reg.id} className="text-xs">
                  {reg.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {portalUrl ? (
          <Button
            render={
              <a href={portalUrl} target="_blank" rel="noopener noreferrer" />
            }
            size="sm"
            nativeButton={false}
            className="h-7 shrink-0 rounded-none bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            <span>Open Portal</span>
            <ExternalLink className="size-3" data-icon="inline-end" />
          </Button>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <AlertCircle className="size-3 text-warning-foreground" />
            <span>Pick registrar to get link</span>
          </div>
        )}

        <Button
          render={
            <a
              href={BSE_ALLOTMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          variant="outline"
          size="sm"
          nativeButton={false}
          className="h-7 shrink-0 rounded-none bg-background text-xs font-medium"
          title="Official BSE Allotment Status Check Portal"
        >
          <span>BSE Check</span>
          <ExternalLink className="size-3" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
