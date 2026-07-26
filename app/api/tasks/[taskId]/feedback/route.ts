export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await params; // consume params
    const body = await req.json();
    const { contentVersionId, adoptionStatus, editNote, rejectionReason, module } = body;

    if (!contentVersionId || !adoptionStatus) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const result = db.insert(feedback).values({
      contentVersionId,
      adoptionStatus,
      editNote: editNote || null,
      rejectionReason: rejectionReason || null,
      module: module || null,
    }).returning();

    const [fb] = result.all();
    return NextResponse.json(fb, { status: 201 });
  } catch (error) {
    console.error("提交反馈失败:", error);
    return NextResponse.json({ error: "提交反馈失败" }, { status: 500 });
  }
}
