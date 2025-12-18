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
    const project = await projectService.createProject(body)
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
