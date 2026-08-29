import { Card, CardContent } from "@/components/ui/card"
import { LayoutDashboard, FileText, Users, Landmark } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your IPO tracking overview
        </p>
      </div>

      {/* Summary cards placeholder */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={FileText} label="Total IPOs" value="0" />
        <SummaryCard
          icon={LayoutDashboard}
          label="Active Applications"
          value="0"
        />
        <SummaryCard icon={Users} label="Application Accounts" value="0" />
        <SummaryCard icon={Landmark} label="Bank Accounts" value="0" />
      </div>

      {/* Empty state */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-4 size-10 text-muted-foreground/50" />
          <h2 className="text-sm font-medium">Welcome to IPO Tracker</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Start by adding your bank accounts and application accounts, then
            create your first IPO to begin tracking applications.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-9 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
