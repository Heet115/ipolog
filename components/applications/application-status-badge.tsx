import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ApplicationStatus } from "@/types"

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus
  className?: string
  size?: "sm" | "default"
}

export function ApplicationStatusBadge({
  status,
  className,
  size = "default",
}: ApplicationStatusBadgeProps) {
  const sizeClasses =
    size === "sm"
      ? "rounded-none px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider uppercase"
      : "px-2 py-0.5 text-xs font-medium"

  switch (status) {
    case "allotted":
      return (
        <Badge variant="success" className={cn(sizeClasses, className)}>
          Allotted
        </Badge>
      )
    case "not_allotted":
      return (
        <Badge variant="secondary" className={cn(sizeClasses, className)}>
          Not Allotted
        </Badge>
      )
    case "sold":
      return (
        <Badge variant="info" className={cn(sizeClasses, className)}>
          Sold
        </Badge>
      )
    case "pending":
    default:
      return (
        <Badge variant="outline" className={cn(sizeClasses, className)}>
          Pending
        </Badge>
      )
  }
}
