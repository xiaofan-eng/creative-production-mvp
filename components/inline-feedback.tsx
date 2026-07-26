"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface InlineFeedbackProps {
  contentVersionId: number;
  module: "script" | "image_brief" | "storyboard";
  taskId: string;
  existingStatus?: string | null;
  /** 当前模块的文字内容，用于编辑 */
  content: string;
  /** 编辑保存后回调 */
  onContentSaved?: (newContent: string) => void;
  /** 重新生成回调 */
  onRegenerate?: () => void;
}

const statusOptions = [
  { value: "adopted", label: "✅ 采用", className: "border-green-300 bg-green-50 text-green-700 hover:bg-green-100" },
  { value: "modified", label: "✏️ 修改", className: "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100" },
  { value: "rejected", label: "❌ 未采用", className: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100" },
];

export default function InlineFeedback({ contentVersionId, module, taskId, existingStatus, content, onContentSaved, onRegenerate }: InlineFeedbackProps) {
  const [status, setStatus] = useState<string | null>(existingStatus || null);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [saved, setSaved] = useState(!!existingStatus);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (value: string) => {
    if (saved) return;
    setStatus(value);

    if (value === "adopted") {
      setSaving(true);
      try {
        await fetch(`/api/tasks/${taskId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentVersionId,
            adoptionStatus: "adopted",
            editNote: null,
            rejectionReason: null,
            module,
          }),
        });
        setSaved(true);
      } catch {
        alert("保存失败");
      } finally {
        setSaving(false);
      }
    } else if (value === "modified") {
      setEditing(true);
      setShowRejectNote(false);
    } else if (value === "rejected") {
      setEditing(false);
      setShowRejectNote(true);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      // 计算修改差异摘要
      const editNote = editedContent !== content ? `用户修改了${module === "script" ? "脚本" : module === "image_brief" ? "图片Brief" : "分镜"}内容` : "";
      await fetch(`/api/tasks/${taskId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentVersionId,
          adoptionStatus: "modified",
          editNote: editNote + "\n修改后内容：\n" + editedContent,
          rejectionReason: null,
          module,
        }),
      });
      setSaved(false);
      setStatus(null);
      setEditing(false);
      onContentSaved?.(editedContent);
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleRejectSubmit = async () => {
    setSaving(true);
    try {
      await fetch(`/api/tasks/${taskId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentVersionId,
          adoptionStatus: "rejected",
          editNote: rejectNote || null,
          rejectionReason: "other",
          module,
        }),
      });
      setSaved(true);
      setShowRejectNote(false);
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 pt-3 border-t">
      {/* 按钮栏 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">反馈：</span>
        {statusOptions.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            disabled={saved}
            className={`px-3 py-1 rounded-full text-xs border transition-all ${
              status === opt.value
                ? opt.className + " ring-1 ring-offset-1"
                : saved
                ? "border-border text-muted-foreground opacity-50 cursor-not-allowed"
                : "border-border hover:border-primary/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
        {saved && <span className="text-xs text-green-600 ml-2">✓ 已记录</span>}
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className="ml-auto px-3 py-1 rounded-full text-xs border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
          >
            🔄 重新生成
          </button>
        )}
      </div>

      {/* 编辑区域 */}
      {editing && !saved && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">直接编辑内容，完成后点击保存：</p>
          <Textarea
            value={editedContent}
            onChange={e => setEditedContent(e.target.value)}
            rows={Math.min(20, Math.max(5, editedContent.split("\n").length + 2))}
            className="text-sm font-mono"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
              {saving ? "保存中..." : "💾 保存修改"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setEditing(false); setStatus(null); setEditedContent(content); }}>
              取消
            </Button>
          </div>
        </div>
      )}

      {/* 未采用原因 */}
      {showRejectNote && !saved && (
        <div className="mt-3 flex gap-2">
          <Textarea
            placeholder="未采用的原因？（如：卖点不准、太泛、不可执行等）"
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Button size="sm" onClick={handleRejectSubmit} disabled={saving} className="self-end">
            {saving ? "..." : "保存"}
          </Button>
        </div>
      )}
    </div>
  );
}
