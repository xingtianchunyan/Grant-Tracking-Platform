import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import type { Project } from "@/lib/db"
import { parseDurationToEndDate } from "@/lib/utils"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const projectId = Number.parseInt(id)

    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    const [project] = await sql`
      SELECT 
        p.*,
        COUNT(m.id) as total_milestones,
        COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as completed_milestones,
        CASE 
          WHEN COUNT(m.id) = 0 THEN 0
          ELSE ROUND((COUNT(CASE WHEN m.status = 'completed' THEN 1 END)::numeric / COUNT(m.id)::numeric) * 100, 2)
        END as progress_percentage
      FROM projects p
      LEFT JOIN milestones m ON p.id = m.project_id
      WHERE p.id = ${projectId}
      GROUP BY p.id
    `

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const projectId = Number.parseInt(id)

    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }
    const body = await request.json()
    const {
      name,
      description,
      status,
      github_repo,
      discord_channel,
      funding_amount,
      funding_currency,
      funding_details,
      start_date,
      end_date,
      duration,
      creator_username,
      grantee_email,
      mission_expertise,
      campaign_goals,
      website_links,
      program_type,
      category,
      creator_stat_1_name,
      creator_stat_1_number,
      creator_stat_2_name,
      creator_stat_2_number,
      youtube_link,
      tiktok_link,
      twitter_link,
      twitch_link,
      proposal_link,
    } = body

    const safeFundingDetails = Array.isArray(funding_details) ? JSON.stringify(funding_details) : null

    let calculatedEndDate = end_date
    if (!end_date && duration && start_date) {
      const parsedEndDate = parseDurationToEndDate(start_date, duration)
      if (parsedEndDate) {
        calculatedEndDate = parsedEndDate.toISOString().split("T")[0]
      }
    }

    const [project] = (await sql`
      UPDATE projects 
      SET name = COALESCE(${name}, name), 
          description = COALESCE(${description}, description), 
          status = COALESCE(${status}, status), 
          github_repo = COALESCE(${github_repo}, github_repo), 
          discord_channel = COALESCE(${discord_channel}, discord_channel), 
          funding_amount = COALESCE(${funding_amount}, funding_amount), 
          funding_currency = COALESCE(${funding_currency}, funding_currency),
          funding_details = COALESCE(${safeFundingDetails}::jsonb, funding_details),
          start_date = COALESCE(${start_date}, start_date), 
          end_date = COALESCE(${calculatedEndDate}, end_date), 
          duration = COALESCE(${duration}, duration),
          creator_username = COALESCE(${creator_username}, creator_username),
          grantee_email = COALESCE(${grantee_email}, grantee_email),
          mission_expertise = COALESCE(${mission_expertise}, mission_expertise),
          campaign_goals = COALESCE(${campaign_goals}, campaign_goals),
          website_links = COALESCE(${website_links}, website_links),
          program_type = COALESCE(${program_type}, program_type),
          category = COALESCE(${category}, category),
          creator_stat_1_name = COALESCE(${creator_stat_1_name}, creator_stat_1_name),
          creator_stat_1_number = COALESCE(${creator_stat_1_number}, creator_stat_1_number),
          creator_stat_2_name = COALESCE(${creator_stat_2_name}, creator_stat_2_name),
          creator_stat_2_number = COALESCE(${creator_stat_2_number}, creator_stat_2_number),
          youtube_link = COALESCE(${youtube_link}, youtube_link),
          tiktok_link = COALESCE(${tiktok_link}, tiktok_link),
          twitter_link = COALESCE(${twitter_link}, twitter_link),
          twitch_link = COALESCE(${twitch_link}, twitch_link),
          proposal_link = COALESCE(${proposal_link}, proposal_link),
          updated_at = NOW()
      WHERE id = ${projectId}
      RETURNING *
    `) as Project[]

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const projectId = Number.parseInt(id)

    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    await sql`DELETE FROM projects WHERE id = ${projectId}`

    return NextResponse.json({ message: "Project deleted successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
