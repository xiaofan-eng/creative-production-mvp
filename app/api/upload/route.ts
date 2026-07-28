export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import path from "path";

async function uploadToImgbb(base64: string): Promise<string> {
  const body = new URLSearchParams({ image: base64 });
  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
    { method: "POST", body }
  );
  if (!res.ok) throw new Error(`imgbb upload failed: ${res.status}`);
  const data = await res.json();
  return data.data.url as string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "没有上传文件" }, { status: 400 });
    }

    const uploadedFiles: Array<{ name: string; url: string; size: number }> = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");

      // 上传到 imgbb，获取 https URL 供 GLM 视觉接口使用
      const httpsUrl = await uploadToImgbb(base64);

      uploadedFiles.push({
        name: file.name,
        url: httpsUrl,
        size: file.size,
      });
    }

    return NextResponse.json({ files: uploadedFiles }, { status: 201 });
  } catch (error) {
    console.error("上传失败:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
