export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { model } from "@/lib/ai/provider";

export async function POST(req: NextRequest) {
  try {
    const { ocrText, type } = await req.json();

    if (!ocrText) {
      return NextResponse.json({ error: "缺少内容" }, { status: 400 });
    }

    const hint = type === "product"
      ? "请根据以下商品图片识别内容，生成一份300字以内的商品卖点总结，重点提炼：核心功效、成分/技术亮点、适用人群、使用场景、品牌背书。语言简洁，用于辅助AI生成带货素材。"
      : "请根据以下竞品图片识别内容，生成一份300字以内的竞品分析总结，重点提炼：竞品核心卖点、文案风格、差异化特征、目标人群定位。语言简洁，用于辅助AI分析竞争态势。";

    const { text } = await generateText({
      model,
      prompt: `${hint}\n\n原始识别内容：\n${ocrText.slice(0, 3000)}`,
    });

    return NextResponse.json({ summary: text.trim() });
  } catch (error) {
    console.error("总结失败:", error);
    return NextResponse.json({ error: "总结失败" }, { status: 500 });
  }
}
