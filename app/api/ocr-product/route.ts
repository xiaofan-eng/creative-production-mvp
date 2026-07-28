export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

// GLM 视觉接口需要 JWT token，不能直接用裸 API Key
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

// GLM-5V-Turbo 对单张图片 base64 大小有限制，截断到合理长度
function truncateBase64(dataUrl: string, maxBytes = 800_000): string {
  const base64Part = dataUrl.split(",")[1] || "";
  const byteLen = Math.floor(base64Part.length * 0.75);
  if (byteLen <= maxBytes) return dataUrl;
  const maxChars = Math.floor(maxBytes / 0.75);
  const prefix = dataUrl.split(",")[0];
  return prefix + "," + base64Part.slice(0, maxChars);
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrls } = await req.json();

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: "没有图片" }, { status: 400 });
    }

    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    for (const url of imageUrls) {
      const processedUrl = url.startsWith("data:") ? truncateBase64(url) : url;
      content.push({
        type: "image_url",
        image_url: { url: processedUrl },
      });
    }

    content.push({
      type: "text",
      text: "请仔细分析这些商品图片，提取商品的结构化信息，用于电商带货素材生成。请输出：\n1. 商品名称/系列\n2. 核心卖点（每个卖点单独列出，带具体数据或证据）\n3. 成分/原料（如有）\n4. 功效/使用效果\n5. 规格/用量\n6. 适用人群\n7. 图片中出现的所有文字内容\n8. 品牌背书/认证信息（如第三方检测、明星推荐等）\n请结构化输出，尽量详细，这些信息将用于AI生成带货脚本。",
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
    console.error("商品图识别失败:", error);
    return NextResponse.json({ error: "图片识别失败" }, { status: 500 });
  }
}

