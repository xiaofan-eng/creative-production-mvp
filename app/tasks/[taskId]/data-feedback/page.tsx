"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ContentVersion {
  id: number;
  packageIndex: number;
  contentAngle: string;
}

interface PerformanceData {
  impression: number;
  click: number;
  conversion: number;
  comments: number;
}

export default function DataFeedbackPage() {
  const params = useParams();
  const taskId = params.taskId as string;

  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [productTitle, setProductTitle] = useState("");
  const [generateType, setGenerateType] = useState("");
  const [selectedVersionAngle, setSelectedVersionAngle] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [formData, setFormData] = useState({ impression: "", click: "", conversion: "", comments: "" });
  const [submitting, setSubmitting] = useState(false);
  const [dashboard, setDashboard] = useState<PerformanceData | null>(null);
  const [rating, setRating] = useState<string | null>(null);
  const [ratingSaved, setRatingSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.json())
      .then(data => {
        setVersions(data.contentVersions || []);
        setProductTitle(data.product?.title || "");
        setGenerateType(data.task?.generateType || "");

        // 检查是否有已录入的表现数据
        const allVersions = data.contentVersions || [];
        for (const v of allVersions) {
          if (v.performance && v.performance.length > 0) {
            // 找到有数据的记录（排除评价记录：impression > 0）
            const dataRecord = v.performance.find((p: { impression?: number }) => (p.impression || 0) > 0);
            const ratingRecord = v.performance.find((p: { humanReviewNote?: string }) => p.humanReviewNote?.startsWith("数据表现评价:"));

            if (dataRecord) {
              setSelectedVersion(v.id);
              setSelectedVersionAngle(v.contentAngle);
              setDashboard({
                impression: dataRecord.impression || 0,
                click: dataRecord.click || 0,
                conversion: dataRecord.conversion || 0,
                comments: parseInt((dataRecord.humanReviewNote || "").replace("评论数: ", "")) || 0,
              });
              setFormData({
                impression: String(dataRecord.impression || ""),
                click: String(dataRecord.click || ""),
                conversion: String(dataRecord.conversion || ""),
                comments: String(parseInt((dataRecord.humanReviewNote || "").replace("评论数: ", "")) || ""),
              });
            }

            if (ratingRecord) {
              const match = (ratingRecord.humanReviewNote || "").match(/数据表现评价: .+ (.+)/);
              const labelMap: Record<string, string> = {
                "非常好": "excellent", "良好": "good", "一般": "average", "较差": "poor", "非常差": "very_poor",
              };
              if (match) {
                setRating(labelMap[match[1]] || null);
                setRatingSaved(true);
              } else {
                // fallback: 从完整文本匹配
                const noteText = ratingRecord.humanReviewNote || "";
                if (noteText.includes("非常好")) { setRating("excellent"); setRatingSaved(true); }
                else if (noteText.includes("良好")) { setRating("good"); setRatingSaved(true); }
                else if (noteText.includes("一般")) { setRating("average"); setRatingSaved(true); }
                else if (noteText.includes("较差")) { setRating("poor"); setRatingSaved(true); }
                else if (noteText.includes("非常差")) { setRating("very_poor"); setRatingSaved(true); }
              }
            }
            break;
          }
        }
      })
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleSubmit = async () => {
    if (!selectedVersion) return;
    setSubmitting(true);

    const impression = parseInt(formData.impression) || 0;
    const click = parseInt(formData.click) || 0;
    const conversion = parseInt(formData.conversion) || 0;
    const comments = parseInt(formData.comments) || 0;
    const ctr = impression > 0 ? (click / impression) * 100 : 0;

    try {
      await fetch(`/api/tasks/${taskId}/performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentVersionId: selectedVersion,
          impression,
          click,
          ctr: parseFloat(ctr.toFixed(2)),
          conversion,
          humanReviewNote: `评论数: ${comments}`,
        }),
      });

      setDashboard({ impression, click, conversion, comments });
    } catch {
      alert("提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  const generateTypeLabels: Record<string, string> = {
    script: "📝 带货脚本",
    image_brief: "🖼️ 商品图/封面Brief",
    storyboard: "🎬 短视频分镜",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">录入数据反馈</h1>
          <p className="text-muted-foreground text-sm mt-1">{productTitle}</p>
          <div className="flex items-center gap-2 mt-2">
            {generateType && (
              <Badge variant="outline">{generateTypeLabels[generateType] || generateType}</Badge>
            )}
            {selectedVersionAngle && (
              <Badge variant="secondary">方案：{selectedVersionAngle}</Badge>
            )}
          </div>
        </div>
        <Link href="/">
          <Button variant="outline">← 返回</Button>
        </Link>
      </div>

      {/* 数据看板 */}
      {dashboard && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-base">📊 数据看板</CardTitle>
            <CardDescription>已录入的素材表现数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-2xl font-bold">{dashboard.impression.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">曝光量</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-2xl font-bold">{dashboard.click.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">点击量</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  CTR: {dashboard.impression > 0 ? ((dashboard.click / dashboard.impression) * 100).toFixed(2) : 0}%
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-2xl font-bold">{dashboard.conversion.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">转化成单</p>
                <p className="text-xs text-green-600 mt-0.5">
                  转化率: {dashboard.click > 0 ? ((dashboard.conversion / dashboard.click) * 100).toFixed(2) : 0}%
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-2xl font-bold">{dashboard.comments.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">评论数</p>
              </div>
            </div>

            {/* 数据表现评价 */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm font-medium mb-3">数据表现情况：</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "excellent", label: "🌟 非常好", color: "border-green-400 bg-green-50 text-green-700" },
                  { value: "good", label: "👍 良好", color: "border-blue-400 bg-blue-50 text-blue-700" },
                  { value: "average", label: "➖ 一般", color: "border-yellow-400 bg-yellow-50 text-yellow-700" },
                  { value: "poor", label: "👎 较差", color: "border-orange-400 bg-orange-50 text-orange-700" },
                  { value: "very_poor", label: "❌ 非常差", color: "border-red-400 bg-red-50 text-red-700" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={ratingSaved}
                    onClick={async () => {
                      setRating(opt.value);
                      if (!selectedVersion) return;
                      // 保存评价到数据库
                      await fetch(`/api/tasks/${taskId}/performance`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          contentVersionId: selectedVersion,
                          impression: 0,
                          click: 0,
                          ctr: 0,
                          conversion: 0,
                          humanReviewNote: `数据表现评价: ${opt.label}`,
                        }),
                      });
                      setRatingSaved(true);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                      rating === opt.value
                        ? opt.color + " ring-2 ring-offset-1"
                        : ratingSaved
                        ? "border-border text-muted-foreground opacity-50 cursor-not-allowed"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {ratingSaved && <p className="text-xs text-green-600 mt-2">✓ 评价已保存</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 选择方案 */}
      {!dashboard && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">第一步：选择最终采用的方案</CardTitle>
              <CardDescription>选择你实际使用/发布的方案版本</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {versions.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setSelectedVersion(v.id); setSelectedVersionAngle(v.contentAngle); }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedVersion === v.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">方案 {v.packageIndex}</Badge>
                      <span className="text-sm">{v.contentAngle}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 录入数据 */}
          {selectedVersion && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">第二步：填写素材表现数据</CardTitle>
                <CardDescription>录入该素材发布后的实际表现</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>曝光量</Label>
                    <Input
                      type="number"
                      placeholder="如：5000"
                      value={formData.impression}
                      onChange={e => setFormData({ ...formData, impression: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>点击量</Label>
                    <Input
                      type="number"
                      placeholder="如：120"
                      value={formData.click}
                      onChange={e => setFormData({ ...formData, click: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>转化成单数</Label>
                    <Input
                      type="number"
                      placeholder="如：15"
                      value={formData.conversion}
                      onChange={e => setFormData({ ...formData, conversion: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>评论数</Label>
                    <Input
                      type="number"
                      placeholder="如：8"
                      value={formData.comments}
                      onChange={e => setFormData({ ...formData, comments: e.target.value })}
                    />
                  </div>
                </div>
                <Button className="w-full mt-4" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "提交中..." : "提交数据并生成看板"}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
