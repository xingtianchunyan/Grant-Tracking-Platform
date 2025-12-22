"use client"

import { Plus, Edit, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useProjects } from "@/hooks/use-projects"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { capitalizeStatus } from "@/lib/utils"

export default function AdminDashboardPage() {
  const { projects, isLoading, error } = useProjects()

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="pt-20">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage grant projects and track progress</p>
            </div>
            <Link href="/admin/projects/new">
              <Button className="bg-[#10c0dd] hover:bg-[#0ea5e9] text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Project Management</h2>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#10c0dd]" />
              </div>
            ) : error ? (
              <div className="text-red-500 py-8">Error loading projects: {error}</div>
            ) : projects.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center bg-card/50 rounded-lg border border-border/50">
                No projects found. Create your first project to get started.
              </div>
            ) : (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="bg-card/80 backdrop-blur-sm border-border/50 hover:border-[#10c0dd]/50 transition-colors">
                    <CardContent className="p-4 md:p-6 flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-lg text-white truncate">{project.name}</h3>
                          <Badge variant="outline" className="text-xs border-[#10c0dd]/30 text-[#10c0dd]">
                            {capitalizeStatus(project.category || "General")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {project.description || "No description provided"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/projects/${project.id}/edit`}>
                          <Button variant="outline" size="sm" className="border-[#10c0dd] text-[#10c0dd] hover:bg-[#10c0dd]/10">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Project
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
