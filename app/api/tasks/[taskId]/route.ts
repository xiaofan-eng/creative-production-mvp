import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, products, productProfiles, contentVersions, feedback, performance } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const id = parseInt(taskId);

    const [task] = db.select().from(tasks).where(eq(tasks.id, id)).all();
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    const [product] = db.select().from(products).where(eq(products.id, task.productId)).all();
    const [profile] = db.select().from(productProfiles).where(eq(productProfiles.productId, task.productId)).all();
    const versions = db.select().from(contentVersions).where(eq(contentVersions.taskId, id)).all();

    // 获取每个内容版本的反馈和表现数据
    const versionsWithFeedback = versions.map(v => {
      const fb = db.select().from(feedback).where(eq(feedback.contentVersionId, v.id)).all();
      const perf = db.select().from(performance).where(eq(performance.contentVersionId, v.id)).all();
      return { ...v, feedback: fb, performance: perf };
    });

    return NextResponse.json({
      task,
      product,
      profile,
      contentVersions: versionsWithFeedback,
    });
  } catch (error) {
    console.error("获取任务详情失败:", error);
    return NextResponse.json({ error: "获取任务详情失败" }, { status: 500 });
  }
}
