"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MIND_HOOKS = [
  { value: "冲突感", label: "冲突感", desc: "制造认知反差，如「你一直以为XX，其实……」" },
  { value: "熟悉感", label: "熟悉感", desc: "唤起共鸣场景，如「每次XX的时候你是不是……」" },
  { value: "陌生感", label: "陌生感", desc: "呈现新知/新奇，如「原来XX还能这样用」" },
];

const MIND_VALUES = [
  { value: "满足感", label: "满足感", desc: "解决了问题、如释重负" },
  { value: "成就感", label: "成就感", desc: "做到了某件事、被认可" },
  { value: "参与感", label: "参与感", desc: "我也想试试、一起来" },
];

const CONTENT_GOALS = [
  { value: "mind_penetration", label: "🧠 心智渗透", desc: "让用户记住品类/场景，建立品牌认知" },
  { value: "business_penetration", label: "💰 生意渗透", desc: "推动转化、加购或复购" },
];

export default function StrategyPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [userGoal, setUserGoal] = useState("");
  const [scene, setScene] = useState("");
  const [need, setNeed] = useState("");
  const [barrier, setBarrier] = useState("");
  const [solution, setSolution] = useState("");
  const [mindHook, setMindHook] = useState("");
  const [mindValue, setMindValue] = useState("");
  const [contentGoal, setContentGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载已保存的策略配置
  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.json())
      .then(data => {
        const task = data.task || {};
        if (task.tonbsUserGoal) setUserGoal(task.tonbsUserGoal);
        if (task.tonbsScene) setScene(task.tonbsScene);
        if (task.tonbsNeed) setNeed(task.tonbsNeed);
        if (task.tonbsBarrier) setBarrier(task.tonbsBarrier);
        if (task.tonbsSolution) setSolution(task.tonbsSolution);
        if (task.preferMindHook) setMindHook(task.preferMindHook);
        if (task.preferMindValue) setMindValue(task.preferMindValue);
        if (task.contentGoal) setContentGoal(task.contentGoal);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await fetch(`/api/tasks/${taskId}/strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tonbsUserGoal: userGoal || null,
          tonbsScene: scene || null,
          tonbsNeed: need || null,
          tonbsBarrier: barrier || null,
          tonbsSolution: solution || null,
          preferMindHook: mindHook || null,
          preferMindValue: mindValue || null,
          contentGoal: contentGoal || null,
        }),
      });
      router.push(`/tasks/${taskId}/analysis`);
    } catch {
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push(`/tasks/${taskId}/analysis`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">内容策略配置</h1>
        <p className="text-muted-foreground text-sm mt-1">
          填写用户洞察和内容目标，帮助 AI 生成更精准的内容方向。所有字段均为<span className="font-medium">非必填</span>，跳过也可直接生成。
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">加载中...</div>
      ) : (
      <>
      {/* TONBS 用户洞察 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📋 TONBS 用户洞察</CardTitle>
          <CardDescription>基于 HBG 方法论，帮助 AI 更准确地找到用户痛点和内容切入角度</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              T · 用户目标
              <span className="text-muted-foreground font-normal ml-1 text-xs">用户想实现什么？分功能/情感/社会三层</span>
            </Label>
            <Textarea
              placeholder="例：功能目标-快速防晒不泛白；情感目标-户外活动更有自信；社会目标-被朋友认为会保养"
              value={userGoal}
              onChange={e => setUserGoal(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              O · 用户场景
              <span className="text-muted-foreground font-normal ml-1 text-xs">谁、在什么时候、什么地方、做什么、通常怎么解决</span>
            </Label>
            <Textarea
              placeholder="例：20-30岁爱户外的女性，夏季出游/运动前，担心防晒不持久，通常喷完就走但容易出汗失效"
              value={scene}
              onChange={e => setScene(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              N · 用户需求
              <span className="text-muted-foreground font-normal ml-1 text-xs">功能需求 + 情感需求</span>
            </Label>
            <Textarea
              placeholder="例：功能需求-防水防汗持久防护；情感需求-不用频繁补涂，减少焦虑感"
              value={need}
              onChange={e => setNeed(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              B · 用户障碍
              <span className="text-muted-foreground font-normal ml-1 text-xs">什么卡住了用户的决策或使用</span>
            </Label>
            <Textarea
              placeholder="例：不确定遇水后防护力是否真的更强；价格比普通防晒贵，不知道值不值；喷雾型担心喷不均匀"
              value={barrier}
              onChange={e => setBarrier(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              S · 更优方案
              <span className="text-muted-foreground font-normal ml-1 text-xs">我们比竞品强在哪里，更换代价是否足够低</span>
            </Label>
            <Textarea
              placeholder="例：遇水成膜技术（功能更优）；资生堂背书安心感（情感更优）；20ml便携版低门槛试用（更换代价更低）"
              value={solution}
              onChange={e => setSolution(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* 心智钩子 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🧲 心智钩子偏好</CardTitle>
          <CardDescription>选择希望内容主要使用的吸引方式，AI 会优先采用但不强制所有角度一致</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">面子钩子 <span className="text-muted-foreground font-normal text-xs">开头吸引眼球的方式</span></Label>
            <div className="grid grid-cols-3 gap-2">
              {MIND_HOOKS.map(h => (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setMindHook(mindHook === h.value ? "" : h.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    mindHook === h.value
                      ? "border-blue-400 bg-blue-50 ring-1 ring-blue-400"
                      : "border-border hover:border-blue-200"
                  }`}
                >
                  <p className="font-medium text-sm">{h.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{h.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">里子价值 <span className="text-muted-foreground font-normal text-xs">内容传递的深层情绪</span></Label>
            <div className="grid grid-cols-3 gap-2">
              {MIND_VALUES.map(v => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setMindValue(mindValue === v.value ? "" : v.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    mindValue === v.value
                      ? "border-purple-400 bg-purple-50 ring-1 ring-purple-400"
                      : "border-border hover:border-purple-200"
                  }`}
                >
                  <p className="font-medium text-sm">{v.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 内容目标 KPI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🎯 内容目标 KPI</CardTitle>
          <CardDescription>这次生成的内容主要服务什么业务目标</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {CONTENT_GOALS.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => setContentGoal(contentGoal === g.value ? "" : g.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  contentGoal === g.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm">{g.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{g.desc}</p>
              </button>
            ))}
          </div>
          {!contentGoal && <p className="text-xs text-muted-foreground mt-2">不选则 AI 自由判断内容方向</p>}
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-between pt-2 pb-8">
        <Link href={`/tasks/${taskId}/edit`}>
          <Button variant="outline">← 返回修改商品信息</Button>
        </Link>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSkip} disabled={saving}>
            跳过，直接分析
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "保存中..." : "保存并开始分析 →"}
          </Button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
