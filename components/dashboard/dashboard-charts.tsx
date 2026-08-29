"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils/ipo"
import type { DashboardMetrics } from "@/lib/calculations/financials"

const financialChartConfig = {
  amount: {
    label: "Amount",
    color: "var(--primary)",
  },
  blocked: {
    label: "Currently Blocked",
    color: "var(--warning)",
  },
  invested: {
    label: "Total Invested",
    color: "var(--success)",
  },
  profit: {
    label: "Your Realized Profit",
    color: "var(--success)",
  },
  shared: {
    label: "Profit Shared",
    color: "var(--info)",
  },
  refund: {
    label: "Expected Refund",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

const statusChartConfig = {
  pending: {
    label: "Pending",
    color: "var(--warning)",
  },
  allotted: {
    label: "Allotted",
    color: "var(--success)",
  },
  notAllotted: {
    label: "Not Allotted",
    color: "var(--muted-foreground)",
  },
  sold: {
    label: "Sold",
    color: "var(--info)",
  },
} satisfies ChartConfig

interface DashboardChartsProps {
  metrics: DashboardMetrics
}

export function DashboardCharts({ metrics }: DashboardChartsProps) {
  const financialData = [
    {
      name: "Blocked",
      amount: metrics.totalBlocked,
      fill: "var(--warning)",
    },
    {
      name: "Invested",
      amount: metrics.totalInvested,
      fill: "var(--success)",
    },
    {
      name: "Net Profit",
      amount: Math.max(0, metrics.totalYourRealizedProfit),
      fill: "var(--success)",
    },
    {
      name: "Shared",
      amount: metrics.totalProfitShared,
      fill: "var(--info)",
    },
    {
      name: "Refunds",
      amount: metrics.totalRefundExpected,
      fill: "var(--muted-foreground)",
    },
  ].filter((d) => d.amount > 0)

  const statusData = [
    {
      name: "Pending",
      value: metrics.pendingApplications,
      fill: "var(--warning)",
    },
    {
      name: "Allotted",
      value: metrics.allottedApplications,
      fill: "var(--success)",
    },
    {
      name: "Not Allotted",
      value: metrics.notAllottedApplications,
      fill: "var(--muted-foreground)",
    },
    {
      name: "Sold",
      value: metrics.soldApplications,
      fill: "var(--info)",
    },
  ].filter((d) => d.value > 0)

  if (financialData.length === 0 && statusData.length === 0) {
    return null
  }

  return (
    <Card className="rounded-none border border-border/60">
      <Tabs defaultValue="capital" className="w-full">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 p-4 pb-3">
          <div>
            <CardTitle className="text-sm font-bold">
              Portfolio Visualizer
            </CardTitle>
            <CardDescription className="text-xs">
              Capital distribution & application breakdown
            </CardDescription>
          </div>
          <TabsList className="h-7 text-xs">
            <TabsTrigger value="capital" className="px-2 py-0.5 text-[11px]">
              Capital
            </TabsTrigger>
            <TabsTrigger value="status" className="px-2 py-0.5 text-[11px]">
              Status
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        {/* Tab 1: Capital Distribution */}
        <TabsContent value="capital" className="m-0 p-4 pt-3">
          {financialData.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
              No financial activity recorded yet
            </div>
          ) : (
            <ChartContainer
              config={financialChartConfig}
              className="h-[180px] w-full"
            >
              <BarChart
                data={financialData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickFormatter={(val) =>
                    `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(val) => formatCurrency(Number(val))}
                    />
                  }
                />
                <Bar dataKey="amount" radius={[0, 0, 0, 0]}>
                  {financialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </TabsContent>

        {/* Tab 2: Application Outcomes */}
        <TabsContent value="status" className="m-0 p-4 pt-3">
          {statusData.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
              No applications recorded yet
            </div>
          ) : (
            <div className="flex h-[180px] flex-col items-center justify-around gap-4 sm:flex-row">
              <ChartContainer
                config={statusChartConfig}
                className="h-[140px] w-[140px]"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={38}
                    outerRadius={62}
                    paddingAngle={2}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              {/* Legend with percentages */}
              <div className="flex flex-col gap-1.5 text-xs">
                {statusData.map((item) => {
                  const pct = (
                    (item.value / Math.max(1, metrics.totalApplications)) *
                    100
                  ).toFixed(0)
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-3 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-none"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-muted-foreground">
                          {item.name}:
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-foreground">
                        {item.value} ({pct}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}
