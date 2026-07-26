import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, products, contentVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateObject } from "ai";
import { model } from "@/lib/ai/provider";
import { scriptSchema, imageBriefSchema, storyboardSchema } from "@/lib/ai/schemas";
import { P4_SYSTEM_PROMPT, formatP4Input } from "@/lib/ai/prompts/p4-script";
import { P5_SYSTEM_PROMPT, formatP5Input } from "@/lib/ai/prompts/p5-image-brief";
import { P6_SYSTEM_PROMPT, formatP6Input } from "@/lib/ai/prompts/p6-storyboard";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const id = parseInt(taskId);
    const { type, contentVersionId, contentAngle } = await req.json();

    if (!type || !contentVersionId || !contentAngle) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const [task] = db.select().from(tasks).where(eq(tasks.id, id)).all();
    if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

    const [product] = db.select().from(products).where(eq(products.id, task.productId)).all();

    // 构造角度信息（保持主题不变）
    const angle = {
      angle: contentAngle,
      targetAudience: "",
      painPoint: "",
      tone: "",
      differentiator: "",
    };

    let result: unknown = null;

    if (type === "script") {
      const { object } = await generateObject({
        model,
        mode: "json",
        schema: scriptSchema,
        system: P4_SYSTEM_PROMPT,
        prompt: formatP4Input(angle, [{ point: contentAngle, evidence: product.detail.slice(0, 200) }], product.title),
      });
      result = object;
      // 更新数据库
      db.update(contentVersions)
        .set({ script: JSON.stringify(object) })
        .where(eq(contentVersions.id, contentVersionId))
        .run();
    } else if (type === "image_brief") {
      const { object } = await generateObject({
        model,
        mode: "json",
        schema: imageBriefSchema,
        system: P5_SYSTEM_PROMPT,
        prompt: formatP5Input(angle, [{ point: contentAngle }], product.title, product.productImages),
      });
      result = object;
      db.update(contentVersions)
        .set({ imageBrief: JSON.stringify(object) })
        .where(eq(contentVersions.id, contentVersionId))
        .run();
    } else if (type === "storyboard") {
      // 获取当前脚本用于生成分镜
      const [cv] = db.select().from(contentVersions).where(eq(contentVersions.id, contentVersionId)).all();
      const currentScript = JSON.parse(cv?.script || "{}");
      const { object } = await generateObject({
        model,
        mode: "json",
        schema: storyboardSchema,
        system: P6_SYSTEM_PROMPT,
        prompt: formatP6Input(currentScript, angle, product.title),
      });
      result = object;
      db.update(contentVersions)
        .set({ storyboard: JSON.stringify(object) })
        .where(eq(contentVersions.id, contentVersionId))
        .run();
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("重新生成失败:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "重新生成失败" }, { status: 500 });
  }
}
