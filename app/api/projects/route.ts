import { type NextRequest, NextResponse } from "next/server"
import { projectService } from "@/lib/services/project.service"
import { handleApiError } from "@/lib/api-helpers"

export async function GET() {
  try {
    const projects = await projectService.getAllProjects()
    return NextResponse.json(projects)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[API] POST /api/projects - Received body:", JSON.stringify(body).slice(0, 200) + "...");
    const project = await projectService.createProject(body)
    console.log("[API] POST /api/projects - Success:", project?.id);
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("[API] POST /api/projects - Error:", error);
    return handleApiError(error)
  }
}
