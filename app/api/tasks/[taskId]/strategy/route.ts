export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const id = parseInt(taskId);
    const body = await req.json();

    const {
      tonbsUserGoal,
      tonbsScene,
      tonbsNeed,
      tonbsBarrier,
      tonbsSolution,
      preferMindHook,
      preferMindValue,
      contentGoal,
    } = body;

    db.update(tasks).set({
      tonbsUserGoal: tonbsUserGoal || null,
      tonbsScene: tonbsScene || null,
      tonbsNeed: tonbsNeed || null,
      tonbsBarrier: tonbsBarrier || null,
      tonbsSolution: tonbsSolution || null,
      preferMindHook: preferMindHook || null,
      preferMindValue: preferMindValue || null,
      contentGoal: contentGoal || null,
    }).where(eq(tasks.id, id)).run();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("保存策略失败:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
