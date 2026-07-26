import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageUrls } = await req.json();

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: "没有图片" }, { status: 400 });
    }

    // 构建多模态消息内容
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    for (const url of imageUrls) {
      // 如果是本地路径，转为完整 URL 供 API 访问
      // 由于智谱 API 需要可访问的 URL，本地图片需转为 base64
      if (url.startsWith("/uploads/")) {
        const fs = await import("fs");
        const path = await import("path");
        const filePath = path.join(process.cwd(), "public", url);
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          const base64 = buffer.toString("base64");
          const ext = path.extname(url).slice(1);
          const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
          content.push({
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          });
        }
      } else {
        content.push({
          type: "image_url",
          image_url: { url },
        });
      }
    }

    content.push({
      type: "text",
      text: "请仔细阅读这些竞品素材图片，提取其中的所有文字信息、卖点表述、视觉元素描述、文案风格，以结构化的方式输出。包括：1. 图片中的所有文字内容 2. 卖点/slogan 3. 视觉风格特征 4. 目标人群暗示 5. 整体营销策略分析",
    });

    // 调用 GLM-5V-Turbo API
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GLM_API_KEY}`,
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
