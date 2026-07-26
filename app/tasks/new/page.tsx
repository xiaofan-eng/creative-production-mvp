"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const taskTypes = [
  { value: "new_product", label: "商品上新", desc: "新商品首次生成素材" },
  { value: "relaunch", label: "老品重推", desc: "已有商品需要换角度" },
  { value: "low_performance", label: "素材表现差", desc: "当前素材效果不佳" },
];

export default function NewTaskPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">加载中...</div>}>
      <NewTaskForm />
    </Suspense>
  );
}

function NewTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = searchParams.get("type") || "new_product";

  const [taskType, setTaskType] = useState(defaultType);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [price, setPrice] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [productImages, setProductImages] = useState("");
  const [uploadedImages, setUploadedImages] = useState<Array<{ name: string; url: string }>>([]);
  const [uploadedCompetitorImages, setUploadedCompetitorImages] = useState<Array<{ name: string; url: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [ocrProductLoading, setOcrProductLoading] = useState(false);
  const [uploadingCompetitor, setUploadingCompetitor] = useState(false);
  const [competitorMaterials, setCompetitorMaterials] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyProducts, setHistoryProducts] = useState<Array<{ id: number; title: string; detail: string; price?: string; targetAudience?: string; productImages?: string; competitorMaterials?: string }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // 加载历史商品列表
  useEffect(() => {
    if (taskType === "relaunch" || taskType === "low_performance") {
      fetch("/api/products/history")
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setHistoryProducts(data); });
    }
  }, [taskType]);

  const selectHistoryProduct = (product: typeof historyProducts[0]) => {
    setTitle(product.title);
    setDetail(product.detail || "");
    setPrice(product.price || "");
    setTargetAudience(product.targetAudience || "");
    setProductImages(product.productImages || "");
    setCompetitorMaterials(product.competitorMaterials || "");
    setShowDropdown(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let uploadedData: Array<{ name: string; url: string }> = [];
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("上传失败");

      const data = await res.json();
      uploadedData = data.files;
      setUploadedImages(prev => [...prev, ...uploadedData]);
    } catch {
      alert("图片上传失败，请重试");
      return;
    } finally {
      setUploading(false);
      e.target.value = "";
    }

    // 上传完成后单独调用 OCR，错误不影响上传流程
    if (uploadedData.length === 0) return;
    setOcrProductLoading(true);
    try {
      // 分批识别，每批最多3张，并行发出所有批次请求
      const BATCH_SIZE = 3;
      const batches: Array<Array<{ name: string; url: string }>> = [];
      for (let i = 0; i < uploadedData.length; i += BATCH_SIZE) {
        batches.push(uploadedData.slice(i, i + BATCH_SIZE));
      }

      const batchResults = await Promise.all(
        batches.map(async (batch, idx) => {
          try {
            const ocrRes = await fetch("/api/ocr-product", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrls: batch.map(img => img.url) }),
            });
            if (ocrRes.ok) {
              const ocrData = await ocrRes.json();
              return ocrData.result || "";
            }
            const errData = await ocrRes.json().catch(() => ({}));
            console.error(`OCR 第${idx + 1}批失败:`, errData);
            return "";
          } catch (err) {
            console.error(`OCR 第${idx + 1}批异常:`, err);
            return "";
          }
        })
      );

      const combined = batchResults.filter(Boolean).join("\n\n");
      if (combined) {
        setDetail(prev => prev
          ? prev + "\n\n---图片识别内容---\n" + combined
          : combined
        );
      }
    } catch (err) {
      console.error("商品图识别失败:", err);
    } finally {
      setOcrProductLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCompetitorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingCompetitor(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("上传失败");

      const data = await res.json();
      setUploadedCompetitorImages(prev => [...prev, ...data.files]);

      // 自动调用 GLM-5V-Turbo 识别竞品图片内容
      const allImages = [...uploadedCompetitorImages, ...data.files];
      const ocrRes = await fetch("/api/ocr-competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: allImages.map((img: { url: string }) => img.url) }),
      });
      if (ocrRes.ok) {
        const ocrData = await ocrRes.json();
        if (ocrData.result) {
          setCompetitorMaterials(prev => prev ? prev + "\n\n---AI识别内容---\n" + ocrData.result : ocrData.result);
        }
      }
    } catch {
      alert("图片上传失败，请重试");
    } finally {
      setUploadingCompetitor(false);
      e.target.value = "";
    }
  };

  const removeCompetitorImage = (index: number) => {
    setUploadedCompetitorImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !detail) return;

    setLoading(true);
    try {
      // 商品图：只传文件名描述，不存 base64（太大）
      const imageDesc = uploadedImages.length > 0
        ? `已上传${uploadedImages.length}张商品图片（${uploadedImages.map(img => img.name).join("、")}）` + (productImages ? `\n补充描述: ${productImages}` : "")
        : productImages || undefined;

      // 竞品图：同上
      const competitorDesc = uploadedCompetitorImages.length > 0
        ? `已上传${uploadedCompetitorImages.length}张竞品图片（${uploadedCompetitorImages.map(img => img.name).join("、")}）` + (competitorMaterials ? `\n识别内容及补充：${competitorMaterials}` : "")
        : competitorMaterials || undefined;

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          title,
          detail,
          price: price || undefined,
          targetAudience: targetAudience || undefined,
          productImages: imageDesc,
          competitorMaterials: competitorDesc,
        }),
      });

      if (!res.ok) throw new Error("创建失败");
      const data = await res.json();
      router.push(`/tasks/${data.task.id}/analysis`);
    } catch {
      alert("创建任务失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>新建素材生成任务</CardTitle>
          <CardDescription>
            填写商品信息，AI 将为你生成带货脚本、商品图/封面 Brief 和短视频分镜
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 任务类型 */}
            <div className="space-y-2">
              <Label>任务类型 *</Label>
              <div className="grid grid-cols-3 gap-3">
                {taskTypes.map(t => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => {
                      setTaskType(t.value);
                      // 切换任务类型时清空表单（老品重推和素材表现差需要从历史选择）
                      if (t.value !== taskType) {
                        setTitle("");
                        setDetail("");
                        setPrice("");
                        setTargetAudience("");
                        setProductImages("");
                        setCompetitorMaterials("");
                        setUploadedImages([]);
                        setUploadedCompetitorImages([]);
                      }
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      taskType === t.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 商品标题 */}
            <div className="space-y-2">
              {(taskType === "relaunch" || taskType === "low_performance") ? (
                <>
                  <Label>选择历史商品 *</Label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-full text-left px-3 py-2 border rounded-md bg-background hover:bg-accent transition-colors"
                    >
                      {title || <span className="text-muted-foreground">点击选择历史商品...</span>}
                    </button>
                    {showDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {historyProducts.length === 0 ? (
                          <p className="p-3 text-sm text-muted-foreground text-center">暂无历史商品</p>
                        ) : (
                          historyProducts.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selectHistoryProduct(p)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0"
                            >
                              {p.title}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Label htmlFor="title">商品标题 *</Label>
                  <Input
                    id="title"
                    placeholder="如：珂润润浸保湿面霜 40g"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </>
              )}
            </div>

            {/* 商品详情 */}
            <div className="space-y-2">
              <Label htmlFor="detail">商品详情/卖点描述 *</Label>
              <Textarea
                id="detail"
                placeholder="填写商品核心信息：成分、功效、规格、使用方法等"
                value={detail}
                onChange={e => setDetail(e.target.value)}
                rows={5}
                required
              />
            </div>

            {/* 价格 */}
            <div className="space-y-2">
              <Label htmlFor="price">价格（建议填写）</Label>
              <Input
                id="price"
                placeholder="如：¥129 / 89-129元"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>

            {/* 目标人群 */}
            <div className="space-y-2">
              <Label htmlFor="audience">目标人群（建议填写）</Label>
              <Input
                id="audience"
                placeholder="如：20-35岁敏感肌女性"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
              />
            </div>

            {/* 商品图上传 */}
            <div className="space-y-2">
              <Label>商品图片（可选）</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={uploading || ocrProductLoading}
                />
                <label htmlFor="image-upload" className="cursor-pointer block">
                  {uploading ? (
                    <p className="text-sm text-muted-foreground">上传中...</p>
                  ) : ocrProductLoading ? (
                    <p className="text-sm text-muted-foreground animate-pulse">🔍 AI 正在识别图片内容...</p>
                  ) : (
                    <>
                      <p className="text-2xl mb-1">📷</p>
                      <p className="text-sm text-muted-foreground">点击上传商品图片（支持多张）</p>
                      <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG、WebP 格式</p>
                    </>
                  )}
                </label>
              </div>
              {/* 已上传图片预览 */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {uploadedImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <p className="text-xs text-muted-foreground truncate mt-1">{img.name}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* 补充图片描述 */}
              <Textarea
                id="images"
                placeholder="补充描述：如白底图风格、场景图已有内容等"
                value={productImages}
                onChange={e => setProductImages(e.target.value)}
                rows={2}
              />
            </div>

            {/* 竞品信息 */}
            <div className="space-y-2">
              <Label>竞品信息（可选）</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCompetitorImageUpload}
                  className="hidden"
                  id="competitor-image-upload"
                  disabled={uploadingCompetitor}
                />
                <label htmlFor="competitor-image-upload" className="cursor-pointer block">
                  {uploadingCompetitor ? (
                    <p className="text-sm text-muted-foreground">上传中...</p>
                  ) : (
                    <>
                      <p className="text-2xl mb-1">📸</p>
                      <p className="text-sm text-muted-foreground">点击上传竞品截图（支持多张）</p>
                      <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG、WebP 格式</p>
                    </>
                  )}
                </label>
              </div>
              {uploadedCompetitorImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {uploadedCompetitorImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeCompetitorImage(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <p className="text-xs text-muted-foreground truncate mt-1">{img.name}</p>
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                id="competitor"
                placeholder="补充描述：竞品文案、素材特点、或链接"
                value={competitorMaterials}
                onChange={e => setCompetitorMaterials(e.target.value)}
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !title || !detail}>
              {loading ? "创建中..." : "🚀 创建任务并开始生成"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="pt-2 text-center">
        <Link href="/">
          <Button variant="ghost">← 返回主页</Button>
        </Link>
      </div>
    </div>
  );
}
