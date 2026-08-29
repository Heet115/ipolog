import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Plus } from "lucide-react"

export default function IposPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">My IPOs</h1>
          <p className="text-sm text-muted-foreground">
            Track your IPO applications and allotments
          </p>
        </div>
        <Button size="sm" disabled>
          <Plus className="mr-1.5 size-4" />
          Add IPO
        </Button>
      </div>

      {/* Empty state */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-4 size-10 text-muted-foreground/50" />
          <h2 className="text-sm font-medium">No IPOs yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add your first IPO to start tracking applications, allotments, and
            profits.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
