export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { db } = await import("@/lib/db");
    const { products } = await import("@/lib/db/schema");
    const allProducts = db.select().from(products).all();
    const uniqueMap = new Map<string, typeof allProducts[0]>();
    for (const p of allProducts) {
      if (!uniqueMap.has(p.title)) {
        uniqueMap.set(p.title, p);
      }
    }
    return NextResponse.json(Array.from(uniqueMap.values()));
  } catch (error) {
    console.error("获取历史商品失败:", error);
    return NextResponse.json([]);
  }
}

