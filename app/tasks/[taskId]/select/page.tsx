"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const contentTypes = [
  {
    id: "script",
    icon: "📝",
    title: "带货脚本",
    description: "生成多版本口播脚本，包含 Hook、痛点、卖点、CTA 等完整结构",
    details: ["3 个差异化角度", "每个角度 1 条完整脚本", "标注事实来源和时长"],
  },
  {
    id: "image_brief",
    icon: "🖼️",
    title: "商品图/封面 Brief",
    description: "生成可执行的商品图设计方案，包含构图、文案、视觉元素",
    details: ["3 个不同风格方向", "含构图/文案/配色/禁忌", "支持一键生成图片"],
  },
  {
    id: "storyboard",
    icon: "🎬",
    title: "短视频分镜",
    description: "将卖点拆解为可拍摄的镜头序列，含画面、动作、口播、素材需求",
    details: ["3 组差异化分镜", "每组 3-7 个镜头", "标注时长和转场"],
  },
];

export default function SelectContentPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleGenerate = async () => {
    if (!selected || creating) return;
    setCreating(true);

    try {
      const taskRes = await fetch(`/api/tasks/${taskId}`);
      const taskData = await taskRes.json();

      // 已完成或已有generateType的任务 → 总是创建新任务，保留原任务记录
      if (taskData.task.status === "completed" || taskData.task.generateType) {
        const product = taskData.product;
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskType: taskData.task.taskType,
            title: product.title,
            detail: product.detail,
            price: product.price || undefined,
            targetAudience: product.targetAudience || undefined,
            productImages: product.productImages || undefined,
            competitorMaterials: product.competitorMaterials || undefined,
          }),
        });
        if (!res.ok) throw new Error("创建失败");
        const data = await res.json();
        router.push(`/tasks/${data.task.id}?generate=${selected}`);
      } else {
        // 任务尚未生成（pending且无generateType）→ 复用当前任务
        router.push(`/tasks/${taskId}?generate=${selected}`);
      }
    } catch {
      alert("操作失败");
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">选择生成内容</h1>
          <p className="text-muted-foreground text-sm mt-1">
            选择一种内容类型进行生成，将产出多个版本供你选择
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {contentTypes.map(type => (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all ${
              selected === type.id
                ? "border-primary ring-2 ring-primary/20"
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelected(type.id)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{type.icon}</div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{type.title}</CardTitle>
                  <CardDescription className="mt-1">{type.description}</CardDescription>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {type.details.map((d, i) => (
                      <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selected === type.id ? "border-primary bg-primary" : "border-border"
                }`}>
                  {selected === type.id && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Link href={`/tasks/${taskId}/analysis`}>
          <Button variant="outline">← 返回分析报告</Button>
        </Link>
        <Button
          onClick={handleGenerate}
          disabled={!selected || creating}
          className="min-w-[200px]"
        >
          {creating ? "创建中..." : "🚀 开始生成"}
        </Button>
      </div>
    </div>
  );
}
