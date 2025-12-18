import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { ActivityService } from "@/lib/services/activity.service"

function asInt(v: string | null, def = 50) {
  const n = v ? Number.parseInt(v) : def
  return Number.isFinite(n) && n > 0 ? n : def
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = Number.parseInt(params.id)
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 })
    }

    const url = new URL(req.url)
    const limit = asInt(url.searchParams.get("limit"), 10)

    const activities = await ActivityService.getProjectActivities(projectId, limit)

    return NextResponse.json(activities)
  } catch (error) {
    console.error("Error fetching project activity:", error)
    return NextResponse.json({ error: "Failed to fetch project activity" }, { status: 500 })
  }
}

// POST /api/projects/:id/activity
// Body: { title: string, description?: string, author?: string, source?: 'discord'|'manual'|'github' }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = Number.parseInt(params.id)
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 })
    }

    const { title, description = "", author = null, source = "manual" } = await req.json()

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Ensure project exists
    const [p] = await sql/*sql*/`SELECT id FROM projects WHERE id = ${projectId}`
    if (!p) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const activity = await ActivityService.createActivity({
      projectId,
      activity_type: 'progress_update',
      source,
      title,
      description,
      url: null,
      author,
      metadata: {}
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error: any) {
    console.error("Error creating project activity:", error)
    return NextResponse.json({ error: "Failed to create project activity" }, { status: 500 })
  }
}
