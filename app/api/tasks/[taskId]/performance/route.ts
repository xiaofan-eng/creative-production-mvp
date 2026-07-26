export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { performance } from "@/lib/db/schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await params;
    const body = await req.json();
    const { contentVersionId, impression, click, ctr, conversion, humanReviewNote } = body;

    if (!contentVersionId) {
      return NextResponse.json({ error: "缺少 contentVersionId" }, { status: 400 });
    }

    const result = db.insert(performance).values({
      contentVersionId,
      impression: impression || null,
      click: click || null,
      ctr: ctr || null,
      conversion: conversion || null,
      humanReviewNote: humanReviewNote || null,
    }).returning();

    const [perf] = result.all();
    return NextResponse.json(perf, { status: 201 });
  } catch (error) {
    console.error("录入表现数据失败:", error);
    return NextResponse.json({ error: "录入表现数据失败" }, { status: 500 });
  }
}
