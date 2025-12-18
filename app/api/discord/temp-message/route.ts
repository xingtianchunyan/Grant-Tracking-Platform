import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { config } from "@/configs/config"

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || ""
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : ""
    
    // Only allow service bot or authorized clients
    if (!config.serviceBotToken || token !== config.serviceBotToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, metadata = {} } = await req.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Expire in 12 hours
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000)

    const [row] = await sql`
      INSERT INTO temp_messages (content, metadata, expires_at)
      VALUES (${content}, ${metadata}, ${expiresAt.toISOString()})
      RETURNING id
    `

    return NextResponse.json({ id: row.id }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating temp message:", error)
    return NextResponse.json({ error: "Failed to create temp message" }, { status: 500 })
  }
}
