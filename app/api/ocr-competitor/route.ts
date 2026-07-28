export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

function generateGlmJwt(apiKey: string): string {
  const [id, secret] = apiKey.split(".");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", sign_type: "SIGN" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    api_key: id,
    exp: Date.now() + 300_000,
    timestamp: Date.now(),
  })).toString("base64url");
  const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrls } = await req.json();

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: "没有图片" }, { status: 400 });
    }

    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    for (const url of imageUrls) {
      // 直接传入 base64 data URL 或外部 URL，不再需要读取本地文件
      content.push({
        type: "image_url",
        image_url: { url },
      });
    }

    content.push({
      type: "text",
      text: "请仔细阅读这些竞品素材图片，提取其中的所有文字信息、卖点表述、视觉元素描述、文案风格，以结构化的方式输出。包括：1. 图片中的所有文字内容 2. 卖点/slogan 3. 视觉风格特征 4. 目标人群暗示 5. 整体营销策略分析",
    });

    const jwt = generateGlmJwt(process.env.GLM_API_KEY!);
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        model: "glm-5v-turbo",
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("GLM API error:", err);
      return NextResponse.json({ error: "图片识别失败", detail: err }, { status: 500 });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "无法识别图片内容";

    return NextResponse.json({ result });
  } catch (error) {
    console.error("图片识别失败:", error);
    return NextResponse.json({ error: "图片识别失败" }, { status: 500 });
  }
}
