import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, products } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

// POST: 创建新任务
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskType, title, detail, price, targetAudience, productImages, competitorMaterials } = body;

    if (!taskType || !title || !detail) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 创建商品记录
    const productResult = db.insert(products).values({
      title,
      detail,
      price: price || null,
      targetAudience: targetAudience || null,
      productImages: productImages || null,
      competitorMaterials: competitorMaterials || null,
    }).returning();

    const [product] = productResult.all();

    // 创建任务记录
    const taskResult = db.insert(tasks).values({
      taskType,
      productId: product.id,
      status: "pending",
    }).returning();

    const [task] = taskResult.all();

    return NextResponse.json({ task, product }, { status: 201 });
  } catch (error) {
    console.error("创建任务失败:", error);
    return NextResponse.json({ error: "创建任务失败" }, { status: 500 });
  }
}

// GET: 获取任务列表
export async function GET() {
  try {
    const taskList = db
      .select()
      .from(tasks)
      .leftJoin(products, eq(tasks.productId, products.id))
      .orderBy(desc(tasks.createdAt))
      .all();

    return NextResponse.json(taskList);
  } catch (error) {
    console.error("获取任务列表失败:", error);
    return NextResponse.json({ error: "获取任务列表失败" }, { status: 500 });
  }
}
