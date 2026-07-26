"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Analysis {
  productProfile: {
    category: string;
    priceRange: string;
    coreFeatures: string[];
  };
  sellingPoints: Array<{
    point: string;
    evidence: string;
    priority: "high" | "medium" | "low";
  }>;
  targetAudience: Array<{
    group: string;
    age: string;
    characteristics: string;
    painPoints: string[];
  }>;
  usageScenarios: Array<{
    scenario: string;
    description: string;
    triggerMoment: string;
  }>;
  competitorComparison: Array<{
    dimension: string;
    ourAdvantage: string;
    competitorApproach: string;
  }>;
  recommendation: {
    summary: string;
    keyDirection: string;
    reasons: string[];
  };
  historicalAnalysis?: {
    hasHistory: boolean;
    summary: string;
    goodPatterns: string[];
    badPatterns: string[];
    iterationDirection: string;
  };
}

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompetitorInfo, setHasCompetitorInfo] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      // 先获取任务信息，判断商品标题和是否有竞品信息
      let productTitle = "";
      try {
        const taskRes = await fetch(`/api/tasks/${taskId}`);
        const taskData = await taskRes.json();
        if (taskData.product?.competitorMaterials) {
          setHasCompetitorInfo(true);
        }
        productTitle = taskData.product?.title || "";
      } catch {}

      // 检查 localStorage 缓存，key 带上商品标题防止串号
      const cacheKey = `analysis_${taskId}_${productTitle}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setAnalysis(JSON.parse(cached));
          setLoading(false);
          return;
        } catch {}
      }
      // 清除旧格式缓存（不带商品标题的）
      localStorage.removeItem(`analysis_${taskId}`);

      try {
        const res = await fetch(`/api/tasks/${taskId}/analyze`, { method: "POST" });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || "分析失败");
          return;
        }
        const data = await res.json();
        setAnalysis(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : "分析失败");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [taskId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="animate-pulse space-y-4">
          <p className="text-lg font-medium">🔍 正在分析商品信息...</p>
          <p className="text-sm text-muted-foreground">AI 正在进行商品结构化解析、卖点提取、人群画像分析</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-red-600">分析失败：{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>重试</Button>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">商品分析报告</h1>
          <p className="text-muted-foreground text-sm mt-1">基于 AI 的商品结构化分析结果</p>
        </div>
      </div>

      {/* 商品结构化 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📦 商品结构化解析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">类目</p>
              <p className="font-medium">{analysis.productProfile.category}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">价格带</p>
              <p className="font-medium">{analysis.productProfile.priceRange}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">核心特征</p>
              <p className="font-medium">{analysis.productProfile.coreFeatures.join("、")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 核心卖点 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">⭐ 核心卖点提取</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.sellingPoints.map((sp, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge variant={sp.priority === "high" ? "default" : sp.priority === "medium" ? "secondary" : "outline"}>
                  {sp.priority === "high" ? "高优" : sp.priority === "medium" ? "中优" : "低优"}
                </Badge>
                <div className="flex-1">
                  <p className="font-medium text-sm">{sp.point}</p>
                  <p className="text-xs text-muted-foreground mt-1">依据：{sp.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 目标人群画像 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">👥 目标人群画像</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.targetAudience.map((audience, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-medium text-sm">{audience.group}</p>
                  <Badge variant="outline" className="text-xs">{audience.age}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{audience.characteristics}</p>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">痛点：</p>
                  <div className="flex flex-wrap gap-1">
                    {audience.painPoints.map((p, j) => (
                      <span key={j} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 使用场景 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🎯 使用场景识别</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.usageScenarios.map((sc, i) => (
              <div key={i} className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium text-sm">{sc.scenario}</p>
                <p className="text-sm text-muted-foreground mt-1">{sc.description}</p>
                <p className="text-xs text-blue-600 mt-1">触发时机：{sc.triggerMoment}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 竞品对比 */}
      {hasCompetitorInfo && analysis.competitorComparison.length > 0 && (
        <Card>
        <CardHeader>
          <CardTitle className="text-base">🆚 竞品卖点对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">对比维度</th>
                  <th className="text-left py-2 px-3 font-medium text-green-700">我们的优势</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">竞品做法</th>
                </tr>
              </thead>
              <tbody>
                {analysis.competitorComparison.map((c, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium">{c.dimension}</td>
                    <td className="py-2 px-3 text-green-700">{c.ourAdvantage}</td>
                    <td className="py-2 px-3 text-muted-foreground">{c.competitorApproach}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* 推荐理由 */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">💡 推荐策略</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{analysis.recommendation.summary}</p>
          <div className="p-3 bg-white rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1">核心内容方向</p>
            <p className="text-sm font-medium">{analysis.recommendation.keyDirection}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">推荐理由：</p>
            <ul className="space-y-1">
              {analysis.recommendation.reasons.map((r, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 历史素材数据分析 */}
      {analysis.historicalAnalysis?.hasHistory && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-base">📈 历史素材数据分析</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{analysis.historicalAnalysis.summary}</p>

            {analysis.historicalAnalysis.goodPatterns.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">✅ 表现好的特征（可参考）：</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.historicalAnalysis.goodPatterns.map((p, i) => (
                    <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {analysis.historicalAnalysis.badPatterns.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">❌ 表现差的特征（需避开）：</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.historicalAnalysis.badPatterns.map((p, i) => (
                    <span key={i} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">{p}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-white rounded-lg border border-amber-100">
              <p className="text-xs text-muted-foreground mb-1">🎯 迭代优化方向</p>
              <p className="text-sm font-medium">{analysis.historicalAnalysis.iterationDirection}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 底部操作 */}
      <div className="flex justify-between pt-4">
        <Link href={`/tasks/${taskId}/edit`}>
          <Button variant="outline">← 返回修改商品信息</Button>
        </Link>
        <Link href={`/tasks/${taskId}/select`}>
          <Button>生成内容包 →</Button>
        </Link>
      </div>
    </div>
  );
}
