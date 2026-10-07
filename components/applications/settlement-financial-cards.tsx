"use client"

import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/ipo"
import type { SettlementCalculation } from "@/lib/utils/whatsapp-settlement"

interface SettlementFinancialCardsProps {
  calculation: SettlementCalculation
}

export function SettlementFinancialCards({
  calculation,
}: SettlementFinancialCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Card
        size="sm"
        className="rounded-none border-border/60 bg-muted/20 px-3 py-2.5"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Capital Applied
          </span>
          <span className="font-mono text-sm font-bold text-foreground">
            {formatCurrency(calculation.investedAmount)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {calculation.allottedShares} sh @ ₹{calculation.issuePrice}
          </span>
        </div>
      </Card>

      <Card
        size="sm"
        className="rounded-none border-border/60 bg-muted/20 px-3 py-2.5"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Sale Proceeds
          </span>
          <span className="font-mono text-sm font-bold text-foreground">
            {formatCurrency(calculation.saleProceeds)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            In owner&apos;s bank @ ₹{calculation.salePrice}
          </span>
        </div>
      </Card>

      <Card
        size="sm"
        className="rounded-none border-border/60 bg-muted/20 px-3 py-2.5"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Owner Keeps ({calculation.profitSharingPercentage}%)
          </span>
          <span className="font-mono text-sm font-bold text-warning-foreground">
            {formatCurrency(calculation.ownerProfitShare)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Profit retention
          </span>
        </div>
      </Card>

      <Card
        size="sm"
        className="rounded-none border-2 border-success/60 bg-success/10 px-3 py-2.5"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold tracking-wider text-success uppercase">
            Transfer to You
          </span>
          <span className="font-mono text-base font-extrabold text-success">
            {formatCurrency(calculation.amountToSendUser)}
          </span>
          <span className="text-[10px] font-medium text-success/90">
            Capital + Your Profit
          </span>
        </div>
      </Card>
    </div>
  )
}
