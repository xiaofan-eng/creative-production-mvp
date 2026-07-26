"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Alert {
  id: number;
  taskId: number;
  triggerType: string;
  triggerReason: string;
  suggestion: string;
  createdAt: string;
}

interface TaskItem {
  tasks: {
    id: number;
    taskType: string;
    status: string;
    generateType?: string | null;
    createdAt: string;
  };
  products: {
    title: string;
  } | null;
  version?: string | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待处理", variant: "secondary" },
  generating: { label: "生成中", variant: "default" },
  completed: { label: "已完成", variant: "outline" },
  failed: { label: "失败", variant: "destructive" },
};

const generateTypeLabels: Record<string, string> = {
  script: "带货脚本",
  image_brief: "商品图/封面Brief",
  storyboard: "短视频分镜",
};

const taskTypeMap: Record<string, string> = {
  new_product: "商品上新",
  relaunch: "老品重推",
  low_performance: "素材表现差",
};

export default function HomePage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    fetch("/api/alerts").then(r => r.json()).then(setAlerts).catch(() => {});
    fetch("/api/tasks").then(r => r.json()).then((data) => {
      if (Array.isArray(data)) {
        const filtered = data.filter((item: TaskItem) =>
          item.tasks.status !== "pending" || item.tasks.generateType
        );

        // 计算每个任务的版本号：同商品+同类型按时间升序排第几次
        const versionPrefix: Record<string, string> = {
          script: "v",
          image_brief: "m",
          storyboard: "u",
        };
        // 按商品title+generateType分组，记录出现次序（升序）
        const countMap: Record<string, number> = {};
        const withVersion = [...filtered].reverse().map((item: TaskItem) => {
          const gt = item.tasks.generateType;
          const title = item.products?.title || "";
          if (!gt || !title) return { ...item, version: null };
          const key = `${title}__${gt}`;
          countMap[key] = (countMap[key] || 0) + 1;
          const prefix = versionPrefix[gt] || "v";
          return { ...item, version: `${prefix}${countMap[key]}` };
        }).reverse();

        setRecentTasks(withVersion);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">商素智作</h1>
        <p className="text-muted-foreground">
          面向抖音电商商家的商品素材生成与反馈优化助手。从商品信息出发，生成带货脚本、商品图/封面 Brief、短视频分镜，并通过反馈数据驱动下一次生成。
        </p>
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/tasks/new?type=new_product">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">🆕 商品上新</CardTitle>
              <CardDescription>为新商品生成一组可测试的带货素材方案</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/tasks/new?type=relaunch">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">🔄 老品重推</CardTitle>
              <CardDescription>为表现下滑的商品换角度重新生成素材</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/tasks/new?type=low_performance">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">📉 素材优化</CardTitle>
              <CardDescription>基于历史反馈优化当前素材策略</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* 最近任务 */}
      <Card>
        <CardHeader>
          <CardTitle>最近任务</CardTitle>
          <CardDescription>你最近的素材生成任务</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              暂无任务，<Link href="/tasks/new" className="text-primary hover:underline">创建第一个任务</Link>
            </p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map(item => {
                const gt = item.tasks.generateType;
                const href = gt
                  ? `/tasks/${item.tasks.id}?generate=${gt}`
                  : `/tasks/${item.tasks.id}`;
                return (
                  <div
                    key={item.tasks.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <Link href={href} className="flex items-center gap-3 flex-1">
                      <Badge variant={statusMap[item.tasks.status]?.variant || "secondary"}>
                        {statusMap[item.tasks.status]?.label || item.tasks.status}
                      </Badge>
                      <span className="font-medium">{item.products?.title || "未知商品"}</span>
                      {gt && (
                        <Badge variant="outline" className="text-xs">
                          {generateTypeLabels[gt] || gt}
                        </Badge>
                      )}
                      {item.version && (
                        <Badge variant="secondary" className="text-xs font-mono">
                          {item.version}
                        </Badge>
                      )}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tasks/${item.tasks.id}/data-feedback`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                      >
                        📊 录入数据反馈
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.tasks.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!confirm("确定删除该任务？删除后不可恢复。")) return;
                          await fetch(`/api/tasks/${item.tasks.id}/delete`, { method: "POST" });
                          setRecentTasks(prev => prev.filter(t => t.tasks.id !== item.tasks.id));
                        }}
                        className="text-muted-foreground hover:text-red-600 transition-colors p-1"
                        title="删除"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
