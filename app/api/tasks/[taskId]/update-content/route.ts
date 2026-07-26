import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await params;
    const { contentVersionId, module, content } = await req.json();

    if (!contentVersionId || !module || !content) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const updateData: Record<string, string> = {};
    if (module === "script") {
      updateData.script = content;
    } else if (module === "image_brief") {
      updateData.imageBrief = content;
    } else if (module === "storyboard") {
      updateData.storyboard = content;
    }

    db.update(contentVersions)
      .set(updateData)
      .where(eq(contentVersions.id, contentVersionId))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新内容失败:", error);
    return NextResponse.json({ error: "更新内容失败" }, { status: 500 });
  }
}
