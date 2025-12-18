import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const [row] = await sql`
      SELECT content, metadata 
      FROM temp_messages 
      WHERE id = ${id} AND expires_at > NOW()
    `

    if (!row) {
      return NextResponse.json({ error: "Message not found or expired" }, { status: 404 })
    }

    return NextResponse.json(row)
  } catch (error) {
    console.error("Error fetching temp message:", error)
    return NextResponse.json({ error: "Failed to fetch message" }, { status: 500 })
  }
}
