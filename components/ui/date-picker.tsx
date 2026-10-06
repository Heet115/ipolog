"use client"

import * as React from "react"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  date?: Date | null
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Select date",
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const formattedDate = date
    ? date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <div className={cn("relative flex w-full min-w-0 items-center", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn(
                "h-8 w-full justify-start rounded-none border border-input bg-background px-2.5 text-left text-xs font-normal transition-colors",
                "hover:border-border hover:bg-muted/30",
                "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40",
                open && "border-primary ring-1 ring-primary/40",
                date && !disabled ? "pr-8" : "",
                !date && "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarIcon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{formattedDate || placeholder}</span>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto rounded-none border border-border bg-popover p-0 shadow-lg"
          align="start"
        >
          <Calendar
            mode="single"
            selected={date || undefined}
            onSelect={(newDate) => {
              onDateChange?.(newDate)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>

      {date && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-1/2 right-1 z-10 size-6 -translate-y-1/2 rounded-none p-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onDateChange?.(undefined)
          }}
          title="Clear date"
        >
          <X className="size-3" />
          <span className="sr-only">Clear date</span>
        </Button>
      )}
    </div>
  )
}
