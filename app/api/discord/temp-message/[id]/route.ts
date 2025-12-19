import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

/**
 * GET /api/discord/temp-message/[id]
 * 功能描述：根据 ID 获取 Discord 临时存储的消息内容及元数据。
 * 该接口是 AI 自动填充流程的第一步，用于获取待分析的原始文本。
 * 
 * @param {NextRequest} req - Next.js 请求对象
 * @param {object} context - 包含动态路由参数的对象
 * @param {Promise<{ id: string }>} context.params - 消息 ID
 * @returns {Promise<NextResponse>} - 返回包含 content 和 metadata 的 JSON 对象
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 在 Next.js 15+ 版本中，动态路由参数 params 是一个 Promise，需要 await 才能获取
    const { id } = await params
    
    // 记录正在获取的消息 ID，方便调试
    console.log(`[API] Fetching temp message: ${id}`);

    // 基础校验：确保 ID 存在
    if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // 从数据库中查询消息内容和元数据
    // 逻辑：ID 匹配且消息未过期（expires_at > NOW()）
    const [row] = await sql`
      SELECT content, metadata 
      FROM temp_messages 
      WHERE id = ${id} AND expires_at > NOW()
    `

    // 如果没有找到对应的消息或消息已过期，返回 404
    if (!row) {
      console.warn(`[API] Temp message not found or expired: ${id}`);
      return NextResponse.json({ error: "Message not found or expired" }, { status: 404 })
    }

    // 返回查询到的数据
    return NextResponse.json(row)
  } catch (error) {
    // 捕获数据库查询或其他未预期错误
    console.error("Error fetching temp message:", error)
    return NextResponse.json({ error: "Failed to fetch message" }, { status: 500 })
  }
}
