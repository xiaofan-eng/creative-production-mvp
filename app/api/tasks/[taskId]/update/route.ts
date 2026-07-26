import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const id = parseInt(taskId);
    const body = await req.json();

    const [task] = db.select().from(tasks).where(eq(tasks.id, id)).all();
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    // 更新任务类型
    if (body.taskType) {
      db.update(tasks).set({ taskType: body.taskType }).where(eq(tasks.id, id)).run();
    }

    // 更新商品信息
    db.update(products).set({
      title: body.title,
      detail: body.detail,
      price: body.price,
      targetAudience: body.targetAudience,
      productImages: body.productImages,
      competitorMaterials: body.competitorMaterials,
    }).where(eq(products.id, task.productId)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
