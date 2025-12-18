import { type NextRequest, NextResponse } from "next/server"
import { config } from "@/configs/config"

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    if (!config.siliconFlowApiKey) {
        // Fallback mock if no key
        console.warn("[AI] No SiliconFlow API Key. Returning mock data.");
        return NextResponse.json(mockExtraction(content));
    }

    // Call SiliconFlow API (OpenAI compatible)
    // Model: deepseek-ai/DeepSeek-V3 or similar
    const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.siliconFlowApiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3", // Or Qwen/Qwen2.5-72B-Instruct
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
            
            If a field cannot be found, leave it as null or empty string.
            Do not include markdown code blocks (like \`\`\`json) in the response, just the raw JSON string.`
          },
          {
            role: "user",
            content: content
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("[AI] SiliconFlow API Error:", response.status, errText);
        throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();
    let rawJson = data.choices?.[0]?.message?.content || "{}";
    
    // Clean up markdown code blocks if present
    rawJson = rawJson.replace(/^```json\s*/, "").replace(/```$/, "").trim();

    try {
        const extracted = JSON.parse(rawJson);
        return NextResponse.json(extracted);
    } catch (e) {
        console.error("[AI] Failed to parse JSON:", rawJson);
        return NextResponse.json({ projectDescription: content }, { status: 200 }); // Fallback
    }

  } catch (error: any) {
    console.error("Error extracting project info:", error)
    return NextResponse.json({ error: "Failed to extract info" }, { status: 500 })
  }
}

function mockExtraction(text: string) {
    // Simple heuristic fallback
    const lines = text.split('\n');
    let title = "";
    let budget = 0;
    
    for(const line of lines) {
        if(line.toLowerCase().includes("title:") || line.toLowerCase().includes("project:")) {
            title = line.split(':')[1]?.trim() || "";
        }
        if(line.toLowerCase().includes("budget:") || line.toLowerCase().includes("funding:")) {
            const match = line.match(/\d+/);
            if(match) budget = parseInt(match[0]);
        }
    }

    return {
        projectName: title,
        projectDescription: text,
        fundingRequested: budget,
        category: "development",
        programType: "milestone"
    };
}
