import { type NextRequest, NextResponse } from "next/server"
import { config } from "@/configs/config"
import "@/lib/proxy" // Apply global proxy settings if available

/**
 * POST /api/ai/extract-project-info
 * 功能描述：接收项目描述文本，调用 SiliconFlow AI 模型提取结构化的项目信息（如项目名称、描述、类别、金额等）。
 * 
 * @param {NextRequest} req - Next.js 请求对象，期望包含 JSON 格式的 { content: string }
 * @returns {Promise<NextResponse>} - 返回结构化的 JSON 数据或错误信息
 * @throws {Error} - 当 API 请求超时或解析失败时抛出异常
 * 
 * 示例用法：
 * fetch('/api/ai/extract-project-info', {
 *   method: 'POST',
 *   body: JSON.stringify({ content: '项目名称是 Test，预算 1000...' })
 * })
 */
export async function POST(req: NextRequest) {
  try {
    // 从请求体中解析出待处理的文本内容
    const { content } = await req.json()

    // 校验内容是否存在，如果为空则返回 400 错误
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // 检查是否配置了 SiliconFlow API Key，如果没有配置则回退到模拟提取
    if (!config.siliconFlowApiKey) {
        // 当缺失 API Key 时，在控制台打印警告并返回模拟数据，保证系统不崩溃
        console.warn("[AI] No SiliconFlow API Key. Returning mock data.");
        return NextResponse.json(mockExtraction(content));
    }

    // 调用 SiliconFlow API (兼容 OpenAI 接口格式)
    // 使用模型: Qwen/Qwen3-8B
    console.log("[AI] Calling SiliconFlow API with Qwen model...");
    
    // 初始化中止控制器，用于设置请求超时
    const controller = new AbortController();
    // 设置 30 秒超时时间，超时后会中止 fetch 请求
    const timeoutId = setTimeout(() => controller.abort(), 30000); 

    let response;
    try {
        // 发起对 SiliconFlow 接口的异步请求
        response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.siliconFlowApiKey}`
          },
          body: JSON.stringify({
            // 指定使用的 AI 模型
            model: "Qwen/Qwen3-8B",
            messages: [
              {
                role: "system",
                content: `You are an AI assistant that extracts structured project information from text.
                Extract the following fields into a strictly valid JSON object:
                - projectName: string (inferred title)
                - projectDescription: string (detailed description)
                - category: string (One of: "development", "education", "infrastructure", "content", "research", "technology")
                - fundingRequested: number (numeric value only)
                - githubRepo: string (URL)
                - proposalLink: string (URL)
                - programType: string ("milestone" or "program")
                - duration: string (e.g. "3 months")
                - granteeEmail: string (Find email in text, if NOT found, return "fornervos@gmail.com")
                - missionExpertise: string (Infer and summarize the project's mission and the team's expertise from the context. MUST NOT be empty.)
                - campaignGoals: string (Infer and summarize the project's campaign goals and intended impact from the context. MUST NOT be empty.)
                
                If a field cannot be found (except for granteeEmail, missionExpertise, and campaignGoals which have special instructions above), leave it as null or empty string.
                Do not include markdown code blocks (like \`\`\`json) in the response, just the raw JSON string.`
              },
              {
                role: "user",
                content: content
              }
            ],
            // 设置较低的随机性（Temperature），以获得更稳定的结构化输出
            temperature: 0.1,
            // 限制生成的最大 Token 数量
            max_tokens: 4000
          }),
          // 将中止信号绑定到 fetch 请求
          signal: controller.signal
        });
    } catch (fetchError: any) {
        // 如果错误类型是 AbortError，说明请求由于我们设置的 30s 超时而中断
        if (fetchError.name === 'AbortError') {
             throw new Error("AI API Request Timeout");
        }
        // 抛出其他类型的 fetch 错误
        throw fetchError;
    } finally {
        // 无论成功还是失败，都清除超时定时器，防止内存泄漏
        clearTimeout(timeoutId);
    }

    // 如果 API 响应状态码不是 2xx，处理错误响应
    if (!response.ok) {
        const errText = await response.text();
        console.error("[AI] SiliconFlow API Error:", response.status, errText);
        // 返回包含具体错误信息的 JSON，方便前端调试
        return NextResponse.json({ error: `AI Provider Error: ${response.statusText} - ${errText.slice(0, 100)}` }, { status: 500 });
    }

    // 解析 API 返回的 JSON 数据
    const data = await response.json();
    // 获取模型生成的文本内容，如果为空则默认为空 JSON 字符串
    let rawJson = data.choices?.[0]?.message?.content || "{}";
    
    // 清理可能包含的思考过程内容 (如 <think> ... </think>)
    rawJson = rawJson.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // 清理可能包含的 Markdown 代码块标记 (如 ```json ... ```)
    rawJson = rawJson.replace(/^```json\s*/, "").replace(/```$/, "").trim();

    try {
        // 尝试将清洗后的字符串解析为 JSON 对象
        const extracted = JSON.parse(rawJson);
        // 返回提取出的结构化项目信息
        return NextResponse.json(extracted);
    } catch (e) {
        // 如果 JSON 解析失败，打印原始字符串以供排查
        console.error("[AI] Failed to parse JSON:", rawJson);
        // 回退到基于启发式规则的模拟提取，确保用户流程不中断
        return NextResponse.json(mockExtraction(content)); 
    }

  } catch (error: any) {
    // 捕获并记录整个过程中的任何未预期错误
    console.error("Error extracting project info:", error)
    // 返回详细的错误信息给客户端
    return NextResponse.json({ error: `Failed to extract info: ${error.message}` }, { status: 500 })
  }
}

/**
 * mockExtraction
 * 功能描述：当 AI 接口不可用或返回数据格式异常时，使用的基于规则的项目信息提取回退方案。
 * 
 * @param {string} text - 待处理的原始文本
 * @returns {object} - 返回一个包含基本项目信息的对象
 */
function mockExtraction(text: string) {
    // 将文本按行分割，方便逐行处理
    const lines = text.split('\n');
    let title = "";
    let budget = 0;
    
    // 遍历每一行，寻找关键词以提取信息
    for(const line of lines) {
        // 检查是否包含 "title:" 或 "project:" 关键词（不区分大小写）
        if(line.toLowerCase().includes("title:") || line.toLowerCase().includes("project:")) {
            // 提取冒号后的内容作为项目名称
            title = line.split(':')[1]?.trim() || "";
        }
        // 检查是否包含 "budget:" 或 "funding:" 关键词
        if(line.toLowerCase().includes("budget:") || line.toLowerCase().includes("funding:")) {
            // 使用正则表达式匹配数字，提取预算金额
            const match = line.match(/\d+/);
            if(match) budget = parseInt(match[0]);
        }
    }

    // 返回组装好的结构化对象
    return {
        projectName: title,
        projectDescription: text,
        fundingRequested: budget,
        category: "development",
        programType: "milestone",
        granteeEmail: "fornervos@gmail.com",
        missionExpertise: "Extracted from text description",
        campaignGoals: "Extracted from text description"
    };
}
