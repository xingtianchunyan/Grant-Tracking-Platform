import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Project } from "@/lib/types"
import { formatFundingDetails } from "@/lib/utils"

interface ProjectProgressProps {
  project: Project
}

export function ProjectProgress({ project }: ProjectProgressProps) {
  return (
    <Card
      className="bg-card/80 backdrop-blur-sm border-border/50 mb-6"
      style={{ borderRadius: "var(--wui-border-radius-m)" }}
    >
      <CardContent className="p-4">
        <div className="flex justify-end mb-2">
          <span className="text-sm font-semibold text-white">{Math.round(project.progress_percentage || 0)}%</span>
        </div>
        <Progress value={project.progress_percentage || 0} className="h-2 bg-border [&>div]:bg-[#10c0dd]" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-2 gap-1">
          <p className="text-xs text-muted-foreground">
            {project.completed_milestones} of {project.total_milestones} milestones completed
          </p>
          <p className="text-xs text-muted-foreground">
            {project.funding_amount
              ? formatFundingDetails(project.funding_details, project.funding_amount, project.funding_currency || "USD")
              : "TBD"}{" "}
            allocated
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
