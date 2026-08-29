import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Landmark, Plus } from "lucide-react"

export default function BankAccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Bank Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage the bank accounts you use for IPO applications
          </p>
        </div>
        <Button size="sm" disabled>
          <Plus className="mr-1.5 size-4" />
          Add Bank
        </Button>
      </div>

      {/* Empty state */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Landmark className="mb-4 size-10 text-muted-foreground/50" />
          <h2 className="text-sm font-medium">No bank accounts yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add the bank accounts you use for IPO applications, e.g. &quot;HDFC
            Bank •1234&quot;.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
