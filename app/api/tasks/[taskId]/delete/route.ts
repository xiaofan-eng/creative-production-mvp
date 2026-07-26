export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, contentVersions, feedback, performance } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const id = parseInt(taskId);

    // 删除关联的反馈和表现数据
    const versions = db.select().from(contentVersions).where(eq(contentVersions.taskId, id)).all();
    for (const v of versions) {
      db.delete(feedback).where(eq(feedback.contentVersionId, v.id)).run();
      db.delete(performance).where(eq(performance.contentVersionId, v.id)).run();
    }

    // 删除内容版本
    db.delete(contentVersions).where(eq(contentVersions.taskId, id)).run();

    // 删除任务
    db.delete(tasks).where(eq(tasks.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
