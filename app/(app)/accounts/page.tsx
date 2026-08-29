import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Plus } from "lucide-react"

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Application Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage the accounts you use for IPO applications
          </p>
        </div>
        <Button size="sm" disabled>
          <Plus className="mr-1.5 size-4" />
          Add Account
        </Button>
      </div>

      {/* Empty state */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="mb-4 size-10 text-muted-foreground/50" />
          <h2 className="text-sm font-medium">No application accounts yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add application accounts like &quot;My Account 1&quot; or
            &quot;Other Account 1&quot; to start tracking IPO applications.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
