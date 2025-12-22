// app/api/cron/risk-scan/route.ts
import { NextResponse, NextRequest } from "next/server"
import { sql } from "@/lib/db"
import { config } from "@/configs/config"
import { ActivityService } from "@/lib/services/activity.service"
import { IntegrationService, type GithubCommitSummary, type GithubPrSummary } from "@/lib/services/integration.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// --- helpers ---
const DAY_MS = 24 * 60 * 60 * 1000
const DAYS_30_MS = 30 * DAY_MS

function isAtLeast30DaysOld(baseDate: Date | null) {
  if (!baseDate || isNaN(baseDate.getTime())) return false
  const age = Date.now() - baseDate.getTime()
  return age >= DAYS_30_MS
}

// --- core job ---

function computeBaseDate(start_date: string | null, created_at: string | null): Date | null {
  const now = Date.now()

  const created = created_at ? new Date(created_at) : null
  const start = start_date ? new Date(start_date) : null

  const isValidPast = (d: Date | null) =>
    !!d && !isNaN(d.getTime()) && d.getTime() <= now

  if (isValidPast(start)) return start
  if (isValidPast(created)) return created
  return null
}

async function runRiskScanJob() {
  console.log('[risk-scan] Starting scan job...');
  
  // global 30-day window (for Discord, and as a floor for GitHub)
  const globalSince = new Date(Date.now() - DAYS_30_MS)
  const globalSinceIso = globalSince.toISOString()

  // 0) FIRST: mark all overdue milestones as 'overdue'
  await sql/*sql*/`
    UPDATE milestones
    SET status = 'overdue'
    WHERE 
      due_date IS NOT NULL
      AND due_date <= NOW()
      AND status <> 'completed'
      AND status <> 'overdue'
  `

  // 1) Load projects
  const projects = await sql/*sql*/`
    SELECT id, name, status, github_repo, created_at, start_date
    FROM projects
    ORDER BY created_at DESC
  `

  // 2) Preload earliest overdue milestone per project
  const milestonesRows = await sql/*sql*/`
    SELECT 
      m.project_id,
      MIN(m.due_date) AS earliest_overdue_due
    FROM milestones m
    WHERE 
      m.due_date IS NOT NULL
      AND m.status <> 'completed'
      AND m.due_date <= NOW()
    GROUP BY m.project_id
  `

  const milestoneMap = new Map<number, { earliest_overdue_due: string | null }>()

  for (const row of milestonesRows as any[]) {
    milestoneMap.set(row.project_id, {
      earliest_overdue_due: row.earliest_overdue_due,
    })
  }

  const results: Array<{
    projectId: number
    name: string
    base_date: string | null
    age_days: number | null
    repo: string | null
    repo_check: "none" | "checked" | "invalid" | "error"
    github: { commitActivity?: boolean; pullActivity?: boolean; reason?: string }
    discord: { hasActivity: boolean; countKnown?: number }
    final: "active" | "at-risk"
    note: string
    milestone_overdue_days?: number | null
  }> = []

  for (const p of projects as any[]) {
    const baseDate = computeBaseDate(p.start_date, p.created_at)

    if (!baseDate) {
      results.push({
        projectId: p.id,
        name: p.name,
        base_date: null,
        age_days: null,
        repo: IntegrationService.normalizeRepo(p.github_repo),
        repo_check: "none",
        github: { reason: "invalid_or_future_start/created_at" },
        discord: { hasActivity: false, countKnown: 0 },
        final: "active",
        note: "Invalid or future start/created date; skipped (status unchanged)",
      })
      continue
    }

    const ageMs = Date.now() - baseDate.getTime()
    const ageDays = Math.max(0, Math.floor(ageMs / DAY_MS))

    // milestone-based overdue age
    const milestoneInfo = milestoneMap.get(p.id) || null
    let milestoneOverdueDays: number | null = null

    if (milestoneInfo?.earliest_overdue_due) {
      const due = new Date(milestoneInfo.earliest_overdue_due)
      if (!isNaN(due.getTime())) {
        milestoneOverdueDays = Math.floor((Date.now() - due.getTime()) / DAY_MS)
      }
    }

    const hasOverdueMilestone =
      milestoneOverdueDays !== null && milestoneOverdueDays >= 0

    const eligibleForRiskScan =
      isAtLeast30DaysOld(baseDate) || hasOverdueMilestone

    // Discord window: last 30 days (global)
    const discordCount = await ActivityService.getDiscordActivityCount(p.id, globalSinceIso)
    const discordHas = discordCount > 0

    // Per-project "since" for GitHub:
    // must be >= project baseDate and within last 30 days
    const sinceForGithub = new Date(
      Math.max(globalSince.getTime(), baseDate.getTime())
    )
    const sinceForGithubIso = sinceForGithub.toISOString()

    const normRepo = IntegrationService.normalizeRepo(p.github_repo)
    let repo_check: "none" | "checked" | "invalid" | "error" = "none"
    let gh: { commitActivity?: boolean; pullActivity?: boolean; reason?: string } = {}

    // GitHub logic
    if (normRepo === null && p.github_repo) {
      repo_check = "invalid"
      gh = { reason: "invalid_repo_format" }
    } else if (normRepo) {
      const ghRes = await IntegrationService.syncGithubActivity(p.id, p.github_repo, sinceForGithubIso)
      if (!ghRes.ok) {
        repo_check = ghRes.reason?.startsWith("invalid_repo_format") ? "invalid" : "error"
        gh = { reason: ghRes.reason }
      } else {
        repo_check = "checked"
        gh = {
          commitActivity: !!ghRes.commitActivity,
          pullActivity: !!ghRes.pullActivity,
        }
      }
    } else {
      repo_check = "none"
    }

    // If project & milestones are too new, skip risk update
    if (!eligibleForRiskScan) {
      results.push({
        projectId: p.id,
        name: p.name,
        base_date: baseDate.toISOString(),
        age_days: ageDays,
        repo: normRepo,
        repo_check,
        github: gh,
        discord: { hasActivity: discordHas, countKnown: discordCount },
        final: "active",
        note: "Project and milestones < 30 days old (skipped for risk-scan; status unchanged)",
        milestone_overdue_days: milestoneOverdueDays,
      })
      continue
    }

    const noGithubActivity =
      !normRepo ||
      (repo_check === "checked" && !gh.commitActivity && !gh.pullActivity) ||
      repo_check === "invalid" ||
      repo_check === "error"

    let final: "active" | "at-risk" = "active"
    let note = ""

    if (hasOverdueMilestone) {
      final = "at-risk"

      if (!discordHas && noGithubActivity) {
        note = `Overdue milestone (${milestoneOverdueDays} days) and no Discord/GitHub activity in 30d`
      } else {
        note = `Overdue milestone (${milestoneOverdueDays} days)`
      }
    } else {
      final = !discordHas && noGithubActivity ? "at-risk" : "active"

      if (final === "at-risk") {
        if (!normRepo) note = "No Discord updates in 30d and no GitHub repo set"
        else if (repo_check === "invalid")
          note = "No Discord updates in 30d and GitHub repo format is invalid"
        else if (repo_check === "error")
          note = "No Discord updates in 30d and GitHub check errored"
        else note = "No Discord updates in 30d and no GitHub activity in 30d"
      } else {
        note = "Has Discord and/or GitHub activity in 30d"
      }
    }

    // Update project status if needed
    if (final === "at-risk" && p.status !== "at-risk") {
      await sql/*sql*/`
        UPDATE projects
        SET status = 'at-risk'
        WHERE id = ${p.id}
      `
    }

    results.push({
      projectId: p.id,
      name: p.name,
      base_date: baseDate.toISOString(),
      age_days: ageDays,
      repo: normRepo,
      repo_check,
      github: gh,
      discord: { hasActivity: discordHas, countKnown: discordCount },
      final,
      note,
      milestone_overdue_days: milestoneOverdueDays,
    })
  }

  return { since: globalSinceIso, results }
}

// --- POST: manual / scheduler trigger with SERVICE_BOT_TOKEN ---
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || ""
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : ""
    if (!config.serviceBotToken || token !== config.serviceBotToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const out = await runRiskScanJob()
    return NextResponse.json(out)
  } catch (e: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("[risk-scan][POST] error:", e)
    }
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization")

    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const out = await runRiskScanJob()
    return NextResponse.json(out)
  } catch (e: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("[risk-scan][GET] error:", e)
    }
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    )
  }
}
