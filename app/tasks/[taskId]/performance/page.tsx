"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContentVersion {
  id: number;
  packageIndex: number;
  contentAngle: string;
}

export default function PerformancePage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [perfData, setPerfData] = useState<Record<number, {
    impression: string;
    click: string;
    ctr: string;
    conversion: string;
    humanReviewNote: string;
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

  const updatePerf = (versionId: number, field: string, value: string) => {
    setPerfData(prev => ({
      ...prev,
      [versionId]: { ...prev[versionId], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      for (const version of versions) {
        const perf = perfData[version.id];
        if (!perf) continue;

        const impression = perf.impression ? parseInt(perf.impression) : null;
        const click = perf.click ? parseInt(perf.click) : null;
        const ctr = impression && click ? (click / impression) * 100 : perf.ctr ? parseFloat(perf.ctr) : null;

        await fetch(`/api/tasks/${taskId}/performance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentVersionId: version.id,
            impression,
            click,
            ctr,
            conversion: perf.conversion ? parseInt(perf.conversion) : null,
            humanReviewNote: perf.humanReviewNote || null,
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
        <h1 className="text-2xl font-bold">录入表现数据</h1>
        <p className="text-muted-foreground mt-1">手动录入素材发布后的表现数据，系统将据此生成优化建议</p>
      </div>

      {versions.map(v => (
        <Card key={v.id}>
          <CardHeader>
            <CardTitle className="text-base">方案 {v.packageIndex}: {v.contentAngle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>曝光量</Label>
                <Input
                  type="number"
                  placeholder="如：5000"
                  value={perfData[v.id]?.impression || ""}
                  onChange={e => updatePerf(v.id, "impression", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>点击量</Label>
                <Input
                  type="number"
                  placeholder="如：120"
                  value={perfData[v.id]?.click || ""}
                  onChange={e => updatePerf(v.id, "click", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>CTR (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="自动计算或手动输入"
                  value={
                    perfData[v.id]?.impression && perfData[v.id]?.click
                      ? ((parseInt(perfData[v.id].click) / parseInt(perfData[v.id].impression)) * 100).toFixed(2)
                      : perfData[v.id]?.ctr || ""
                  }
                  onChange={e => updatePerf(v.id, "ctr", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>转化量</Label>
                <Input
                  type="number"
                  placeholder="如：15"
                  value={perfData[v.id]?.conversion || ""}
                  onChange={e => updatePerf(v.id, "conversion", e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>人工复盘备注</Label>
                <Textarea
                  placeholder="例如：封面点击还行但转化差，可能是价格没有优势"
                  value={perfData[v.id]?.humanReviewNote || ""}
                  onChange={e => updatePerf(v.id, "humanReviewNote", e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
        {submitting ? "提交中..." : "提交表现数据"}
      </Button>
    </div>
  );
}
