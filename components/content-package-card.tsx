"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import InlineFeedback from "@/components/inline-feedback";

interface ContentPackageCardProps {
  version: {
    id: number;
    packageIndex: number;
    contentAngle: string;
    script: string;
    imageBrief: string;
    storyboard: string;
    riskFlags: string;
    manualCheckItems: string;
    recommendReason: string;
    overallRiskLevel?: string | null;
    feedback?: Array<{ adoptionStatus: string; module?: string }>;
  };
  taskId: string;
  generateType?: string | null; // "script" | "image_brief" | "storyboard" | null (all)
}

interface ScriptSection {
  type: string;
  content: string;
  duration: string;
  note?: string;
}

interface Shot {
  shotNumber: number;
  scene: string;
  action: string;
  voiceover: string;
  materialNeeded: string;
  duration: string;
  transition?: string;
}

interface RiskFlag {
  type: string;
  content: string;
  suggestion: string;
  severity: string;
}

interface CheckItem {
  item: string;
  reason: string;
}

export default function ContentPackageCard({ version: v, taskId, generateType }: ContentPackageCardProps) {
  const [scriptData, setScriptData] = useState(() => JSON.parse(v.script || "{}"));
  const [briefData, setBriefData] = useState(() => JSON.parse(v.imageBrief || "{}"));
  const [storyboardData, setStoryboardData] = useState(() => JSON.parse(v.storyboard || "{}"));
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<{ type: string; data: unknown } | null>(null);
  const risks: RiskFlag[] = JSON.parse(v.riskFlags || "[]");
  const checks: CheckItem[] = JSON.parse(v.manualCheckItems || "[]");

  const handleRegenerate = async (type: string) => {
    setRegenerating(type);
    setPendingResult(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/regenerate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          contentVersionId: v.id,
          contentAngle: v.contentAngle,
        }),
      });
      if (!res.ok) throw new Error("生成失败");
      const data = await res.json();
      setPendingResult({ type, data: data.result });
    } catch {
      alert("重新生成失败，请重试");
    } finally {
      setRegenerating(null);
    }
  };

  const confirmRegenerate = async () => {
    if (!pendingResult) return;
    const { type, data } = pendingResult;
    if (type === "script") setScriptData(data);
    if (type === "image_brief") setBriefData(data);
    if (type === "storyboard") setStoryboardData(data);
    setPendingResult(null);

    // 记录重新生成操作到反馈表
    const moduleLabel = type === "script" ? "带货脚本" : type === "image_brief" ? "商品图Brief" : "短视频分镜";
    await fetch(`/api/tasks/${taskId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentVersionId: v.id,
        adoptionStatus: "modified",
        editNote: `用户重新生成了「${moduleLabel}」内容并确认替换`,
        rejectionReason: null,
        module: type,
      }),
    });
  };

  const cancelRegenerate = () => {
    setPendingResult(null);
  };

  // 格式化脚本文本用于编辑
  const formatScriptText = () =>
    scriptData.sections?.map((s: ScriptSection) => `[${s.type}] (${s.duration}) ${s.content}`).join("\n") || "";

  // 格式化 Brief 文本用于编辑
  const formatBriefText = () => [
    `构图：${briefData.composition || ""}`,
    `主视觉：${briefData.mainVisual || ""}`,
    `文案：${briefData.copywriting || ""}`,
    `配色：${briefData.colorScheme || ""}`,
    `卖点承接：${briefData.sellingPointConnection || ""}`,
    `元素：${briefData.elements?.join("、") || ""}`,
    `禁忌：${briefData.taboos?.join("、") || ""}`,
  ].join("\n");

  // 格式化分镜文本用于编辑
  const formatStoryboardText = () =>
    storyboardData.shots?.map((shot: Shot) =>
      `镜头${shot.shotNumber} (${shot.duration})\n画面：${shot.scene}\n动作：${shot.action}\n口播：${shot.voiceover}\n素材：${shot.materialNeeded}`
    ).join("\n\n") || "";

  // 脚本编辑保存后解析回结构
  const handleScriptSaved = async (newText: string) => {
    const lines = newText.split("\n").filter(l => l.trim());
    const sections = lines.map(line => {
      const match = line.match(/^\[(.+?)\]\s*\((.+?)\)\s*(.+)$/);
      if (match) {
        return { type: match[1], duration: match[2], content: match[3] };
      }
      return { type: "content", duration: "", content: line };
    });
    const newData = { ...scriptData, sections };
    setScriptData(newData);
    // 持久化到数据库
    await fetch(`/api/tasks/${taskId}/update-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentVersionId: v.id, module: "script", content: JSON.stringify(newData) }),
    });
  };

  // Brief 编辑保存后解析回结构
  const handleBriefSaved = async (newText: string) => {
    const lines = newText.split("\n");
    const parseField = (prefix: string) => {
      const line = lines.find(l => l.startsWith(prefix));
      return line ? line.slice(prefix.length).trim() : "";
    };
    const newData = {
      composition: parseField("构图："),
      mainVisual: parseField("主视觉："),
      copywriting: parseField("文案："),
      colorScheme: parseField("配色："),
      sellingPointConnection: parseField("卖点承接："),
      elements: parseField("元素：").split("、").filter(Boolean),
      taboos: parseField("禁忌：").split("、").filter(Boolean),
    };
    setBriefData(newData);
    await fetch(`/api/tasks/${taskId}/update-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentVersionId: v.id, module: "image_brief", content: JSON.stringify(newData) }),
    });
  };

  // 分镜编辑保存后解析回结构
  const handleStoryboardSaved = async (newText: string) => {
    const blocks = newText.split("\n\n").filter(b => b.trim());
    const shots = blocks.map((block, i) => {
      const lines = block.split("\n");
      const headerMatch = lines[0]?.match(/^镜头(\d+)\s*\((.+?)\)/);
      const parseField = (prefix: string) => {
        const line = lines.find(l => l.trim().startsWith(prefix));
        return line ? line.slice(line.indexOf(prefix) + prefix.length).trim() : "";
      };
      return {
        shotNumber: headerMatch ? parseInt(headerMatch[1]) : i + 1,
        duration: headerMatch ? headerMatch[2] : "",
        scene: parseField("画面："),
        action: parseField("动作："),
        voiceover: parseField("口播："),
        materialNeeded: parseField("素材："),
      };
    });
    const newData = { ...storyboardData, shots };
    setStoryboardData(newData);
    await fetch(`/api/tasks/${taskId}/update-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentVersionId: v.id, module: "storyboard", content: JSON.stringify(newData) }),
    });
  };

  const showScript = !generateType || generateType === "script";
  const showBrief = !generateType || generateType === "image_brief";
  const showStoryboard = !generateType || generateType === "storyboard";

  // 如果指定了类型，只展示该类型；如果未指定，隐藏没有实际内容的模块
  const hasScriptContent = scriptData.sections?.length > 0;
  const hasBriefContent = !!(briefData.composition || briefData.mainVisual || briefData.copywriting);
  const hasStoryboardContent = storyboardData.shots?.length > 0;

  const shouldShowScript = showScript && hasScriptContent;
  const shouldShowBrief = showBrief && hasBriefContent;
  const shouldShowStoryboard = showStoryboard && hasStoryboardContent;
  const isHighRisk = v.overallRiskLevel === "high_risk";

  return (
    <div className="space-y-4">
      {/* 高风险拦截提示 */}
      {isHighRisk && (
        <div className="rounded-lg border-2 border-red-400 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚫</span>
            <div>
              <p className="font-semibold text-red-800 text-sm">高风险内容警告</p>
              <p className="text-red-700 text-sm mt-1">
                该方案包含平台违禁宣称（如绝对化效果承诺、未经验证的功效、量化减重承诺等），
                不可直接发布。内容已从低风险角度重新生成，请仔细核查下方风险提示后再决定是否采用。
              </p>
              <p className="text-red-600 text-xs mt-2 font-medium">⚠️ 建议：直接采用前请删除或替换所有标注的高风险表述。</p>
            </div>
          </div>
        </div>
      )}

      {/* 推荐理由 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 推荐理由</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{
            (() => {
              let text = v.recommendReason || "";
              // 去掉开头的编号如 "1." "**1. xxx**" 等
              text = text.replace(/^\*{0,2}\d+[\.\、\)）]\s*/, "");
              // 去掉 "角度名称** – **推荐理由：" 前缀
              const reasonMatch = text.match(/推荐理由[：:]\s*\*{0,2}\s*([\s\S]*)/);
              if (reasonMatch) text = reasonMatch[1];
              // 去掉残留的 ** 标记
              text = text.replace(/\*{2}/g, "").trim();
              return text || "基于商品卖点和目标人群匹配度推荐此方案。";
            })()
          }</p>
        </CardContent>
      </Card>

      {/* 带货脚本 */}
      {shouldShowScript && <Card>
        <CardHeader>
          <CardTitle className="text-base">📝 带货脚本: {scriptData.title}</CardTitle>
          <CardDescription>预估时长: {scriptData.duration}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scriptData.sections?.map((s: ScriptSection, i: number) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">{s.type}</Badge>
                  <span className="text-xs text-muted-foreground">{s.duration}</span>
                </div>
                <p className="text-sm">{s.content}</p>
                {s.note && <p className="text-xs text-muted-foreground mt-1">💡 {s.note}</p>}
              </div>
            ))}
          </div>
          {scriptData.factSources?.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs text-muted-foreground font-medium mb-1">事实来源：</p>
              <ul className="text-xs text-muted-foreground list-disc pl-4">
                {scriptData.factSources.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          <InlineFeedback
            contentVersionId={v.id}
            module="script"
            taskId={taskId}
            content={formatScriptText()}
            existingStatus={(() => { const s = v.feedback?.filter(f => f.module === "script").pop(); return (s?.adoptionStatus === "adopted" || s?.adoptionStatus === "rejected") ? s.adoptionStatus : undefined; })()}
            onContentSaved={handleScriptSaved}
            onRegenerate={regenerating === "script" ? undefined : () => handleRegenerate("script")}
            disableAdopt={isHighRisk}
          />
          {regenerating === "script" && (
            <p className="text-sm text-blue-600 mt-2 animate-pulse">🔄 正在重新生成带货脚本...</p>
          )}
          {pendingResult?.type === "script" && (
            <div className="mt-3 p-3 border-2 border-blue-200 bg-blue-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-blue-800">✨ 新内容已生成，请查看：</p>
              <div className="bg-white rounded-lg p-3 border border-blue-100 space-y-2">
                {(pendingResult.data as { sections?: ScriptSection[] })?.sections?.map((s: ScriptSection, i: number) => (
                  <div key={i} className="p-2 bg-muted/30 rounded text-sm">
                    <span className="text-xs font-medium text-muted-foreground">[{s.type}] ({s.duration})</span>
                    <p className="mt-0.5">{s.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={confirmRegenerate}>确认替换</Button>
                <Button size="sm" variant="outline" onClick={cancelRegenerate}>取消</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>}

      {/* 商品图/封面 Brief */}
      {shouldShowBrief && <Card>
        <CardHeader>
          <CardTitle className="text-base">🖼️ 商品图/封面 Brief</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">构图：</span>{briefData.composition}</div>
            <div><span className="font-medium">配色：</span>{briefData.colorScheme}</div>
            <div className="col-span-2"><span className="font-medium">主视觉：</span>{briefData.mainVisual}</div>
            <div className="col-span-2"><span className="font-medium">文案：</span>{briefData.copywriting}</div>
            <div className="col-span-2"><span className="font-medium">卖点承接：</span>{briefData.sellingPointConnection}</div>
            <div className="col-span-2">
              <span className="font-medium">元素：</span>
              {briefData.elements?.join("、")}
            </div>
            <div className="col-span-2">
              <span className="font-medium text-red-600">禁忌：</span>
              {briefData.taboos?.join("、")}
            </div>
          </div>
          <InlineFeedback
            contentVersionId={v.id}
            module="image_brief"
            taskId={taskId}
            content={formatBriefText()}
            existingStatus={(() => { const s = v.feedback?.filter(f => f.module === "image_brief").pop(); return (s?.adoptionStatus === "adopted" || s?.adoptionStatus === "rejected") ? s.adoptionStatus : undefined; })()}
            onContentSaved={handleBriefSaved}
            onRegenerate={regenerating === "image_brief" ? undefined : () => handleRegenerate("image_brief")}
            disableAdopt={isHighRisk}
          />
          {regenerating === "image_brief" && (
            <p className="text-sm text-blue-600 mt-2 animate-pulse">🔄 正在重新生成商品图Brief...</p>
          )}
          {pendingResult?.type === "image_brief" && (
            <div className="mt-3 p-3 border-2 border-blue-200 bg-blue-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-blue-800">✨ 新内容已生成，请查看：</p>
              <div className="bg-white rounded-lg p-3 border border-blue-100 grid grid-cols-2 gap-2 text-sm">
                {(() => {
                  const b = pendingResult.data as { composition?: string; mainVisual?: string; copywriting?: string; colorScheme?: string; sellingPointConnection?: string; elements?: string[]; taboos?: string[] };
                  return (<>
                    <div><span className="font-medium">构图：</span>{b?.composition}</div>
                    <div><span className="font-medium">配色：</span>{b?.colorScheme}</div>
                    <div className="col-span-2"><span className="font-medium">主视觉：</span>{b?.mainVisual}</div>
                    <div className="col-span-2"><span className="font-medium">文案：</span>{b?.copywriting}</div>
                    <div className="col-span-2"><span className="font-medium">卖点承接：</span>{b?.sellingPointConnection}</div>
                    <div className="col-span-2"><span className="font-medium">元素：</span>{b?.elements?.join("、")}</div>
                    <div className="col-span-2"><span className="font-medium text-red-600">禁忌：</span>{b?.taboos?.join("、")}</div>
                  </>);
                })()}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={confirmRegenerate}>确认替换</Button>
                <Button size="sm" variant="outline" onClick={cancelRegenerate}>取消</Button>
              </div>
            </div>
          )}
          {/* 生成图片按钮 */}
          <div className="mt-4 pt-3 border-t flex items-center justify-end gap-3">
            {generatedImage && (
              <a
                href={generatedImage}
                download={`商品图_方案${v.packageIndex}.png`}
                className="text-sm text-primary hover:underline"
              >
                💾 保存到电脑
              </a>
            )}
            <Button
              size="sm"
              onClick={async () => {
                setGeneratingImage(true);
                setGeneratedImage(null);
                try {
                  const briefText = formatBriefText();
                  const res = await fetch("/api/generate-image", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ brief: briefText }),
                  });
                  if (!res.ok) throw new Error("生成失败");
                  const data = await res.json();
                  setGeneratedImage(data.imageUrl);
                } catch {
                  alert("图片生成失败，请重试");
                } finally {
                  setGeneratingImage(false);
                }
              }}
              disabled={generatingImage}
            >
              {generatingImage ? "🎨 生成中..." : "🎨 立即生成商品图"}
            </Button>
          </div>
          {/* 生成结果预览 */}
          {generatedImage && (
            <div className="mt-3">
              <img
                src={generatedImage}
                alt="AI 生成的商品图"
                className="w-full max-w-md rounded-lg border shadow-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>}

      {/* 短视频分镜 */}
      {shouldShowStoryboard && <Card>
        <CardHeader>
          <CardTitle className="text-base">🎬 短视频分镜</CardTitle>
          <CardDescription>总时长: {storyboardData.totalDuration}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {storyboardData.shots?.map((shot: Shot, i: number) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">镜头 {shot.shotNumber}</Badge>
                  <span className="text-xs text-muted-foreground">{shot.duration}</span>
                  {shot.transition && (
                    <span className="text-xs text-blue-600">→ {shot.transition}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1 text-sm">
                  <p><span className="text-muted-foreground">画面：</span>{shot.scene}</p>
                  <p><span className="text-muted-foreground">动作：</span>{shot.action}</p>
                  <p><span className="text-muted-foreground">口播：</span>{shot.voiceover}</p>
                  <p><span className="text-muted-foreground">素材：</span>{shot.materialNeeded}</p>
                </div>
              </div>
            ))}
          </div>
          <InlineFeedback
            contentVersionId={v.id}
            module="storyboard"
            taskId={taskId}
            content={formatStoryboardText()}
            existingStatus={(() => { const s = v.feedback?.filter(f => f.module === "storyboard").pop(); return (s?.adoptionStatus === "adopted" || s?.adoptionStatus === "rejected") ? s.adoptionStatus : undefined; })()}
            onContentSaved={handleStoryboardSaved}
            onRegenerate={regenerating === "storyboard" ? undefined : () => handleRegenerate("storyboard")}
            disableAdopt={isHighRisk}
          />
          {regenerating === "storyboard" && (
            <p className="text-sm text-blue-600 mt-2 animate-pulse">🔄 正在重新生成短视频分镜...</p>
          )}
          {pendingResult?.type === "storyboard" && (
            <div className="mt-3 p-3 border-2 border-blue-200 bg-blue-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-blue-800">✨ 新内容已生成，请查看：</p>
              <div className="bg-white rounded-lg p-3 border border-blue-100 space-y-2">
                {(pendingResult.data as { shots?: Shot[] })?.shots?.map((shot: Shot, i: number) => (
                  <div key={i} className="p-2 border rounded text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">镜头 {shot.shotNumber}</Badge>
                      <span className="text-xs text-muted-foreground">{shot.duration}</span>
                    </div>
                    <p><span className="text-muted-foreground">画面：</span>{shot.scene}</p>
                    <p><span className="text-muted-foreground">口播：</span>{shot.voiceover}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={confirmRegenerate}>确认替换</Button>
                <Button size="sm" variant="outline" onClick={cancelRegenerate}>取消</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>}

      {/* 风险提示 */}
      {(risks.length > 0 || checks.length > 0) && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-base text-orange-800">⚠️ 风险提示与人工确认</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {risks.map((r, i) => (
              <div key={i} className="p-2 bg-orange-50 rounded text-sm">
                <Badge variant={r.severity === "high" ? "destructive" : "secondary"} className="text-xs mb-1">
                  {r.severity === "high" ? "高风险" : r.severity === "medium" ? "中风险" : "低风险"}
                </Badge>
                <p>{r.content}</p>
                <p className="text-muted-foreground text-xs mt-1">建议：{r.suggestion}</p>
              </div>
            ))}
            {checks.length > 0 && (
              <>
                <div className="border-t my-2" />
                <div>
                  <p className="text-sm font-medium mb-2">需人工确认：</p>
                  {checks.map((c, i) => (
                    <div key={i} className="text-sm mb-1">
                      • {c.item} <span className="text-muted-foreground">({c.reason})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
