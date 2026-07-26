"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [taskType, setTaskType] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [price, setPrice] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [productImages, setProductImages] = useState("");
  const [competitorMaterials, setCompetitorMaterials] = useState("");
  const [uploadedImages, setUploadedImages] = useState<Array<{ name: string; url: string }>>([]);
  const [uploadedCompetitorImages, setUploadedCompetitorImages] = useState<Array<{ name: string; url: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingCompetitor, setUploadingCompetitor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.json())
      .then(data => {
        if (data.task) setTaskType(data.task.taskType);
        if (data.product) {
          setTitle(data.product.title || "");
          setDetail(data.product.detail || "");
          setPrice(data.product.price || "");
          setTargetAudience(data.product.targetAudience || "");
          setProductImages(data.product.productImages || "");
          setCompetitorMaterials(data.product.competitorMaterials || "");
        }
      })
      .finally(() => setFetching(false));
  }, [taskId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("上传失败");
      const data = await res.json();
      setUploadedImages(prev => [...prev, ...data.files]);

      // 自动调用 GLM-5V-Turbo 识别商品图，追加到商品详情
      const allImages = [...uploadedImages, ...data.files];
      const ocrRes = await fetch("/api/ocr-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: allImages.map((img: { url: string }) => img.url) }),
      });
      if (ocrRes.ok) {
        const ocrData = await ocrRes.json();
        if (ocrData.result) {
          setDetail(prev => prev
            ? prev + "\n\n---图片识别内容---\n" + ocrData.result
            : ocrData.result
          );
        }
      }
    } catch {
      alert("图片上传失败，请重试");
    } finally {
      setUploading(false);
      e.target.value = "";
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
      for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("上传失败");
      const data = await res.json();
      setUploadedCompetitorImages(prev => [...prev, ...data.files]);

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
      const imageDesc = uploadedImages.length > 0
        ? `已上传${uploadedImages.length}张商品图片（${uploadedImages.map(img => img.name).join("、")}）` + (productImages ? `\n补充描述: ${productImages}` : "")
        : productImages || null;

      const competitorDesc = uploadedCompetitorImages.length > 0
        ? `已上传${uploadedCompetitorImages.length}张竞品图片（${uploadedCompetitorImages.map(img => img.name).join("、")}）` + (competitorMaterials ? `\n识别内容及补充：${competitorMaterials}` : "")
        : competitorMaterials || null;

      await fetch(`/api/tasks/${taskId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          title,
          detail,
          price: price || null,
          targetAudience: targetAudience || null,
          productImages: imageDesc,
          competitorMaterials: competitorDesc,
        }),
      });
      router.push(`/tasks/${taskId}/analysis`);
    } catch {
      alert("保存失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="text-center py-12 text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>修改商品信息</CardTitle>
          <CardDescription>修改后将重新进行商品分析</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>任务类型 *</Label>
              <div className="grid grid-cols-3 gap-3">
                {taskTypes.map(t => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setTaskType(t.value)}
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

            <div className="space-y-2">
              <Label htmlFor="title">商品标题 *</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail">商品详情/卖点描述 *</Label>
              <Textarea id="detail" value={detail} onChange={e => setDetail(e.target.value)} rows={5} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">价格</Label>
              <Input id="price" value={price} onChange={e => setPrice(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">目标人群</Label>
              <Input id="audience" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
            </div>

            {/* 商品图片上传 */}
            <div className="space-y-2">
              <Label>商品图片（可选）</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="edit-image-upload"
                  disabled={uploading}
                />
                <label htmlFor="edit-image-upload" className="cursor-pointer block">
                  {uploading ? (
                    <p className="text-sm text-muted-foreground">上传中...</p>
                  ) : (
                    <>
                      <p className="text-2xl mb-1">📷</p>
                      <p className="text-sm text-muted-foreground">点击上传商品图片（支持多张）</p>
                      <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG、WebP 格式</p>
                    </>
                  )}
                </label>
              </div>
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {uploadedImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img.url} alt={img.name} className="w-full h-20 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                      <p className="text-xs text-muted-foreground truncate mt-1">{img.name}</p>
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                id="images"
                placeholder="补充描述：如白底图风格、场景图已有内容等"
                value={productImages}
                onChange={e => setProductImages(e.target.value)}
                rows={2}
              />
            </div>

            {/* 竞品信息上传 */}
            <div className="space-y-2">
              <Label>竞品信息（可选）</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCompetitorImageUpload}
                  className="hidden"
                  id="edit-competitor-image-upload"
                  disabled={uploadingCompetitor}
                />
                <label htmlFor="edit-competitor-image-upload" className="cursor-pointer block">
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
                      <img src={img.url} alt={img.name} className="w-full h-20 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => removeCompetitorImage(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
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

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                取消
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || !title || !detail}>
                {loading ? "保存中..." : "保存并重新分析"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Link href="/">
          <Button variant="ghost">← 返回主页</Button>
        </Link>
      </div>
    </div>
  );
}
