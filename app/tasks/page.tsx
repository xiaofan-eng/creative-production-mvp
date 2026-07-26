"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TaskItem {
  tasks: {
    id: number;
    taskType: string;
    status: string;
    createdAt: string;
  };
  products: {
    id: number;
    title: string;
  } | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待处理", variant: "secondary" },
  generating: { label: "生成中", variant: "default" },
  completed: { label: "已完成", variant: "outline" },
  failed: { label: "失败", variant: "destructive" },
};

const taskTypeMap: Record<string, string> = {
  new_product: "🆕 商品上新",
  relaunch: "🔄 老品重推",
  low_performance: "📉 素材优化",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">历史任务</h1>
        <Link
          href="/tasks/new"
          className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
        >
          + 新建任务
        </Link>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            暂无任务记录。<Link href="/tasks/new" className="text-primary hover:underline">创建第一个任务</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map(item => (
            <Link key={item.tasks.id} href={`/tasks/${item.tasks.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={statusMap[item.tasks.status]?.variant || "secondary"}>
                        {statusMap[item.tasks.status]?.label || item.tasks.status}
                      </Badge>
                      <span className="font-medium">{item.products?.title || "未知商品"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{taskTypeMap[item.tasks.taskType] || item.tasks.taskType}</span>
                      <span>{new Date(item.tasks.createdAt).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
