import { NextResponse } from "next/server"
import { ActivityService } from "@/lib/services/activity.service"

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limit = Number(url.searchParams.get("limit") || 50)
    const projectIdParam = url.searchParams.get("project_id")
    const projectId = projectIdParam ? Number(projectIdParam) : null

    let activities;

    if (projectId) {
      activities = await ActivityService.getProjectActivities(projectId, limit)
    } else {
      activities = await ActivityService.getRecentActivities(limit)
    }

    // Map to the specific format expected by the frontend if needed,
    // although ActivityService returns almost the exact same shape.
    // The service returns `ActivityLog`. Let's check if we need to transform it.
    // Service: id, project_id, project_name, activity_type, source, title, description, url, author, timestamp, link
    // Old Route: id, title, description, project_id, timestamp, type, project, link
    
    const data = activities.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      project_id: r.project_id,
      timestamp: r.timestamp,
      type: r.activity_type,
      project: r.project_name,
      link: r.link,
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching recent updates:", error)
    return NextResponse.json({ error: "Failed to fetch recent updates" }, { status: 500 })
  }
}
