"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContentVersion {
  id: number;
  packageIndex: number;
  contentAngle: string;
}

const adoptionOptions = [
  { value: "adopted", label: "✅ 采用", desc: "可以直接使用" },
  { value: "modified", label: "✏️ 修改后采用", desc: "需要调整部分内容" },
  { value: "rejected", label: "❌ 弃用", desc: "不适合使用" },
];

const rejectionReasons = [
  { value: "selling_point_inaccurate", label: "卖点不准" },
  { value: "too_generic", label: "太泛/没特点" },
  { value: "high_risk", label: "风险太高" },
  { value: "not_executable", label: "不可执行" },
  { value: "other", label: "其他" },
];

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [feedbacks, setFeedbacks] = useState<Record<number, {
    adoptionStatus: string;
    editNote: string;
    rejectionReason: string;
  }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`).then(r => r.json()).then(data => {
      if (data.contentVersions) {
        setVersions(data.contentVersions.map((v: ContentVersion) => ({
          id: v.id,
          packageIndex: v.packageIndex,
          contentAngle: v.contentAngle,
        })));
      }
    });
  }, [taskId]);

  const updateFeedback = (versionId: number, field: string, value: string) => {
    setFeedbacks(prev => ({
      ...prev,
      [versionId]: { ...prev[versionId], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      for (const version of versions) {
        const fb = feedbacks[version.id];
        if (!fb?.adoptionStatus) continue;

        await fetch(`/api/tasks/${taskId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentVersionId: version.id,
            adoptionStatus: fb.adoptionStatus,
            editNote: fb.editNote || null,
            rejectionReason: fb.adoptionStatus === "rejected" ? fb.rejectionReason : null,
          }),
        });
      }
      router.push(`/tasks/${taskId}`);
    } catch {
      alert("提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">提交反馈</h1>
        <p className="text-muted-foreground mt-1">对每组内容方案进行评价，帮助系统下次生成更好的结果</p>
      </div>

      {versions.map(v => (
        <Card key={v.id}>
          <CardHeader>
            <CardTitle className="text-base">方案 {v.packageIndex}: {v.contentAngle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 采用状态 */}
            <div className="space-y-2">
              <Label>使用状态</Label>
              <div className="grid grid-cols-3 gap-2">
                {adoptionOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateFeedback(v.id, "adoptionStatus", opt.value)}
                    className={`p-2 rounded border text-sm text-center transition-all ${
                      feedbacks[v.id]?.adoptionStatus === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 修改点 */}
            {feedbacks[v.id]?.adoptionStatus === "modified" && (
              <div className="space-y-2">
                <Label>修改了哪些内容？</Label>
                <Textarea
                  placeholder="例如：调整了脚本开头，把痛点换成了XX"
                  value={feedbacks[v.id]?.editNote || ""}
                  onChange={e => updateFeedback(v.id, "editNote", e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* 弃用原因 */}
            {feedbacks[v.id]?.adoptionStatus === "rejected" && (
              <div className="space-y-2">
                <Label>弃用原因</Label>
                <div className="flex flex-wrap gap-2">
                  {rejectionReasons.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => updateFeedback(v.id, "rejectionReason", r.value)}
                      className={`px-3 py-1 rounded-full text-sm border transition-all ${
                        feedbacks[v.id]?.rejectionReason === r.value
                          ? "border-red-400 bg-red-50 text-red-700"
                          : "border-border hover:border-red-200"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
        {submitting ? "提交中..." : "提交反馈"}
      </Button>
    </div>
  );
}
