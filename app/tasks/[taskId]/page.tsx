"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import ContentPackageCard from "@/components/content-package-card";

interface TaskData {
  task: { id: number; taskType: string; status: string; generateType?: string | null; createdAt: string };
  product: { title: string; detail: string; price?: string; targetAudience?: string };
  profile?: { category: string; priceRange: string; sellingPoints: string };
  contentVersions: Array<{
    id: number;
    packageIndex: number;
    contentAngle: string;
    script: string;
    imageBrief: string;
    storyboard: string;
    riskFlags: string;
    manualCheckItems: string;
    recommendReason: string;
    feedback: Array<{ adoptionStatus: string; editNote?: string; rejectionReason?: string; module?: string }>;
    performance: Array<{ impression?: number; click?: number; ctr?: number; conversion?: number }>;
  }>;
  previousCaseSummary?: Array<{
    contentAngle: string;
    adoptionStatus: string | null;
    editNote: string | null;
    ctr: number | null;
    impression: number | null;
    performanceRating: string | null;
  }> | null;
}

interface GenerationStep {
  step: number;
  name: string;
  data?: unknown;
}

const STEPS = [
  "商品信息结构化",
  "卖点排序",
  "内容角度生成",
  "生成内容",
  "风险检查",
  "生成推荐理由",
  "完成",
];

export default function TaskDetailPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">加载中...</div>}>
      <TaskDetailContent />
    </Suspense>
  );
}

function TaskDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const taskId = params.taskId as string;
  const generateType = searchParams.get("generate"); // script | image_brief | storyboard

  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) {
      const data = await res.json();
      setTaskData(data);
      return data;
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    let ignore = false;
    fetchTask().then(data => {
      if (!ignore) {
        if (data?.task?.status === "pending") {
          startGeneration();
        } else if (generateType && data?.task?.status === "completed") {
          // 检查该类型是否有实际内容
          const versions = data?.contentVersions || [];
          let hasThisTypeContent = false;
          for (const v of versions) {
            if (generateType === "script") {
              const script = JSON.parse(v.script || "{}");
              if (script.sections?.length > 0) hasThisTypeContent = true;
            } else if (generateType === "image_brief") {
              const brief = JSON.parse(v.imageBrief || "{}");
              if (brief.composition || brief.mainVisual) hasThisTypeContent = true;
            } else if (generateType === "storyboard") {
              const sb = JSON.parse(v.storyboard || "{}");
              if (sb.shots?.length > 0) hasThisTypeContent = true;
            }
          }
          if (!hasThisTypeContent) {
            startGeneration();
          }
        }
      }
    });
    return () => { ignore = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const startGeneration = async () => {
    setGenerating(true);
    setCurrentStep(0);
    setError(null);

    try {
      const url = generateType
        ? `/api/tasks/${taskId}/generate?type=${generateType}`
        : `/api/tasks/${taskId}/generate`;
      const res = await fetch(url, { method: "POST" });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("无法读取流");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter(l => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const event: GenerationStep = JSON.parse(line.slice(6));
            if (event.name === "error") {
              setError((event.data as { message: string })?.message || "生成失败");
            } else {
              setCurrentStep(event.step);
            }
          } catch {}
        }
      }

      await fetchTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  if (!taskData) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  const { task, product, contentVersions: allVersions, previousCaseSummary } = taskData;

  // 只取最新一批的 3 个内容版本（按 id 降序取最后 3 条）
  const versions = allVersions.length > 3
    ? allVersions.slice(-3)
    : allVersions;

  // 生成进度视图
  if (generating || task.status === "generating") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>正在为「{product.title}」生成内容包</CardTitle>
            <CardDescription>AI 正在分析商品信息并生成素材方案，请耐心等待...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={(currentStep / 7) * 100} className="h-2" />
            <div className="space-y-3">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    i + 1 < currentStep ? "bg-green-100 text-green-700" :
                    i + 1 === currentStep ? "bg-blue-100 text-blue-700 animate-pulse" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {i + 1 < currentStep ? "✓" : i + 1}
                  </span>
                  <span className={i + 1 <= currentStep ? "text-foreground" : "text-muted-foreground"}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                ❌ {error}
                <Button variant="outline" size="sm" className="ml-3" onClick={startGeneration}>
                  重试
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // 结果展示视图
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{product.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            创建于 {new Date(task.createdAt).toLocaleString("zh-CN")}
          </p>
        </div>
      </div>

      {task.status === "failed" && versions.length === 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">生成失败，请检查 API Key 配置后重试。</p>
            <Button variant="outline" className="mt-2" onClick={startGeneration}>
              🔄 重新生成
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 参考案例摘要 */}
      {previousCaseSummary && previousCaseSummary.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-800">📋 上次生成参考摘要</CardTitle>
            <p className="text-xs text-blue-600">基于同商品同类型上次生成结果及用户反馈</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {previousCaseSummary.map((c, i) => {
                const statusIcon = c.adoptionStatus === "adopted" ? "✅" : c.adoptionStatus === "rejected" ? "❌" : c.adoptionStatus === "modified" ? "✏️" : "—";
                const statusLabel = c.adoptionStatus === "adopted" ? "已采用" : c.adoptionStatus === "rejected" ? "已弃用" : c.adoptionStatus === "modified" ? "已修改" : "未反馈";
                return (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100">
                    <span className="text-lg mt-0.5">{statusIcon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">方案{i + 1}：{c.contentAngle}</span>
                        <Badge variant="outline" className="text-xs">{statusLabel}</Badge>
                        {c.ctr !== null && (
                          <Badge variant="secondary" className="text-xs">CTR {c.ctr}%</Badge>
                        )}
                        {c.impression !== null && (
                          <span className="text-xs text-muted-foreground">曝光 {c.impression?.toLocaleString()}</span>
                        )}
                        {c.performanceRating && (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">{c.performanceRating}</Badge>
                        )}
                      </div>
                      {c.editNote && (
                        <p className="text-xs text-muted-foreground mt-1">修改方向：{c.editNote}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {versions.length > 0 && (
        <Tabs defaultValue={String(versions[0]?.id)}>
          <TabsList className="grid w-full grid-cols-3 h-auto">
            {versions.map(v => (
              <TabsTrigger key={v.id} value={String(v.id)} className="whitespace-normal text-center py-2 px-2 leading-snug h-auto">
                方案 {v.packageIndex}: {v.contentAngle}
              </TabsTrigger>
            ))}
          </TabsList>

          {versions.map(v => (
            <TabsContent key={v.id} value={String(v.id)}>
              <ContentPackageCard version={v} taskId={taskId} generateType={generateType} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {task.status === "pending" && versions.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Button onClick={startGeneration}>🚀 开始生成</Button>
          </CardContent>
        </Card>
      )}

      {/* 底部返回按钮 */}
      <div className="pt-4 flex justify-between">
        <Link href={`/tasks/${taskId}/select`}>
          <Button variant="outline">← 返回修改素材类型</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">返回主页</Button>
        </Link>
      </div>
    </div>
  );
}
