import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

export async function GET() {
  try {
    // 获取所有不重复的历史商品标题
    const allProducts = db.select().from(products).all();
    // 按标题去重，保留最新的一条
    const uniqueMap = new Map<string, typeof allProducts[0]>();
    for (const p of allProducts) {
      if (!uniqueMap.has(p.title)) {
        uniqueMap.set(p.title, p);
      }
    }
    const uniqueProducts = Array.from(uniqueMap.values());
    return NextResponse.json(uniqueProducts);
  } catch (error) {
    console.error("获取历史商品失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
