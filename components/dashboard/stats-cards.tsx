"use client"

import { memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { toNumberSafe } from "@/lib/client-utils"
import type { Project } from "@/lib/types"
import { formatCompactCurrency } from "@/lib/utils"

interface StatsCardsProps {
  projects: Project[]
}

export const StatsCards = memo(function StatsCards({ projects }: StatsCardsProps) {
  const currencyTotals = projects.reduce((totals, project) => {
    const processDetail = (amount: number, currency: string) => {
      // Normalize USDI to USD for consolidation
      const normalizedCurrency = (currency === "USDI" || currency === "USD") ? "USD" : currency
      totals[normalizedCurrency] = (totals[normalizedCurrency] || 0) + amount
    }

    if (project.funding_details && Array.isArray(project.funding_details) && project.funding_details.length > 0) {
      project.funding_details.forEach((detail) => {
        processDetail(toNumberSafe(detail.amount), detail.currency || "USD")
      })
    } else if (project.funding_amount) {
      processDetail(toNumberSafe(project.funding_amount), project.funding_currency || "CKB")
    }
    return totals
  }, {} as Record<string, number>)

  const totalFundsDisplay =
    Object.entries(currencyTotals)
      .map(([currency, amount]) => formatCompactCurrency(amount, currency))
      .join(" + ") || "0 CKB"

  const activeProjects = projects.filter((p) => p.status.toLowerCase() === "active").length

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-6 mb-6 md:mb-8 mt-6">
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 rounded-[var(--wui-border-radius-m)]">
        <CardContent className="p-2 md:p-6 text-center">
          <h3 className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 font-sf-rounded">Total Funds</h3>
          <p className="text-lg md:text-xl lg:text-3xl font-bold text-white font-sf-rounded break-words">
            {totalFundsDisplay}
          </p>
        </CardContent>
      </Card>
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 rounded-[var(--wui-border-radius-m)]">
        <CardContent className="p-2 md:p-6 text-center">
          <h3 className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 font-sf-rounded">Total Projects</h3>
          <p className="text-lg md:text-3xl font-bold text-white font-sf-rounded">{projects.length}</p>
        </CardContent>
      </Card>
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 rounded-[var(--wui-border-radius-m)]">
        <CardContent className="p-2 md:p-6 text-center">
          <h3 className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 font-sf-rounded">Active Projects</h3>
          <p className="text-lg md:text-3xl font-bold text-white font-sf-rounded">{activeProjects}</p>
        </CardContent>
      </Card>
    </div>
  )
})
