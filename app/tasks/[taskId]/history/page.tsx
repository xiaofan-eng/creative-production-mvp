"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FeedbackRecord {
  adoptionStatus: string;
  editNote?: string;
  rejectionReason?: string;
  module?: string;
  createdAt?: string;
}

interface VersionWithFeedback {
  id: number;
  packageIndex: number;
  contentAngle: string;
  feedback: FeedbackRecord[];
}

const moduleLabels: Record<string, string> = {
  script: "📝 带货脚本",
  image_brief: "🖼️ 商品图/封面Brief",
  storyboard: "🎬 短视频分镜",
};

export default function HistoryPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const [versions, setVersions] = useState<VersionWithFeedback[]>([]);
  const [productTitle, setProductTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.json())
      .then(data => {
        setVersions(data.contentVersions || []);
        setProductTitle(data.product?.title || "");
      })
      .finally(() => setLoading(false));
  }, [taskId]);

  // 按模块分组，每组内按时间倒序
  const allFeedback = versions.flatMap(v =>
    v.feedback.map(fb => ({ ...fb, packageIndex: v.packageIndex, contentAngle: v.contentAngle }))
  );

  const groupByModule = (mod: string) =>
    allFeedback
      .filter(fb => fb.module === mod)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const scriptRecords = groupByModule("script");
  const briefRecords = groupByModule("image_brief");
  const storyboardRecords = groupByModule("storyboard");
  // 未分类的旧记录
  const otherRecords = allFeedback
    .filter(fb => !fb.module)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  const renderRecords = (records: typeof allFeedback) => {
    if (records.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-3">暂无操作记录</p>;
    }
    return (
      <div className="space-y-3">
        {records.map((fb, i) => (
          <div key={i} className="p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={
                  fb.adoptionStatus === "adopted" ? "default" :
                  fb.adoptionStatus === "modified" ? "secondary" : "destructive"
                }>
                  {fb.adoptionStatus === "adopted" ? "✅ 采用" :
                   fb.adoptionStatus === "modified" ? "✏️ 修改" : "❌ 未采用"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  方案 {fb.packageIndex}: {fb.contentAngle.slice(0, 15)}...
                </span>
              </div>
              {fb.createdAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(fb.createdAt).toLocaleString("zh-CN")}
                </span>
              )}
            </div>
            {fb.adoptionStatus === "modified" && fb.editNote && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">修改内容：</p>
                <p className="text-sm bg-muted/50 p-2 rounded whitespace-pre-wrap">{fb.editNote}</p>
              </div>
            )}
            {fb.adoptionStatus === "rejected" && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">未采用原因：</p>
                <p className="text-sm">{fb.editNote || fb.rejectionReason || "未填写"}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">操作记录</h1>
          <p className="text-muted-foreground text-sm mt-1">{productTitle}</p>
        </div>
        <Link href={`/tasks/${taskId}`}>
          <Button variant="outline">← 返回</Button>
        </Link>
      </div>

      {allFeedback.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            暂无操作记录。在内容方案中点击"采用"、"修改"或"未采用"后，记录会出现在这里。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {scriptRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{moduleLabels.script}</CardTitle>
              </CardHeader>
              <CardContent>{renderRecords(scriptRecords)}</CardContent>
            </Card>
          )}

          {briefRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{moduleLabels.image_brief}</CardTitle>
              </CardHeader>
              <CardContent>{renderRecords(briefRecords)}</CardContent>
            </Card>
          )}

          {storyboardRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{moduleLabels.storyboard}</CardTitle>
              </CardHeader>
              <CardContent>{renderRecords(storyboardRecords)}</CardContent>
            </Card>
          )}

          {otherRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📋 其他</CardTitle>
              </CardHeader>
              <CardContent>{renderRecords(otherRecords)}</CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
