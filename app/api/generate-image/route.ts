import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { model } from "@/lib/ai/provider";

export async function POST(req: NextRequest) {
  try {
    const { brief } = await req.json();

    if (!brief) {
      return NextResponse.json({ error: "缺少 brief 描述" }, { status: 400 });
    }

    // 用 DeepSeek 将中文 brief 翻译为图片生成 prompt
    const { text: prompt } = await generateText({
      model,
      system: `你是一个专业的图片 prompt 工程师。将用户提供的商品图/封面 Brief 翻译为一段适合AI生图的 prompt。
要求：
- 详细描述画面内容、构图、色彩、风格、光线
- 适合电商商品海报/封面图的风格
- 中英文均可，尽量详细具象
- 不超过 300 字
- 只输出 prompt 文本，不要其他内容`,
      prompt: brief,
    });

    // 调用智谱 CogView-4 生成图片
    const cogviewRes = await fetch("https://open.bigmodel.cn/api/paas/v4/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: "cogView-4-250304",
        prompt: prompt.trim(),
        size: "1024x1024",
      }),
    });

    if (!cogviewRes.ok) {
      const errText = await cogviewRes.text();
      console.error("CogView API error:", errText);
      throw new Error("图片生成失败: " + errText);
    }

    const cogviewData = await cogviewRes.json();
    const generatedImageUrl = cogviewData.data?.[0]?.url;

    if (!generatedImageUrl) {
      throw new Error("未获取到生成的图片 URL");
    }

    // 下载图片并转为 base64 返回给前端
    const imageRes = await fetch(generatedImageUrl);
    if (!imageRes.ok) {
      throw new Error("下载生成图片失败");
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");
    const contentType = imageRes.headers.get("content-type") || "image/png";

    return NextResponse.json({
      imageUrl: `data:${contentType};base64,${base64}`,
      prompt: prompt.trim(),
    });
  } catch (error) {
    console.error("生成图片失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成图片失败" },
      { status: 500 }
    );
  }
}
