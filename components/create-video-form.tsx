"use client";
/* eslint-disable @next/next/no-img-element -- local object URL previews must not pass through the Next Image optimizer */

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, LoaderCircle, Plus, Sparkles, Trash2, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generatedScriptSchema, type GeneratedScript } from "@/lib/domain/video";
import { createClient } from "@/lib/supabase/client";
import { MAX_IMAGE_BYTES } from "@/lib/uploads/images";

const formSchema = z.object({
  name: z.string().trim().min(1, "请输入商品名称").max(100),
  description: z.string().trim().min(10, "商品描述至少10个字符").max(2000),
  sellingPoints: z.array(z.object({ value: z.string().trim().min(1, "卖点不能为空").max(200) })).min(1).max(10),
  language: z.enum(["zh-CN", "en-US", "ja-JP"]),
  aspectRatio: z.enum(["9:16", "1:1", "16:9"]),
  durationSeconds: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  avatarId: z.string().min(1),
  voiceId: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

const languages = [{ value: "zh-CN", label: "简体中文" }, { value: "en-US", label: "English" }, { value: "ja-JP", label: "日本語" }] as const;
const avatars = [{ value: "mock-avatar-1", label: "林晓 · 专业女主持" }, { value: "mock-avatar-2", label: "陈宇 · 活力男主持" }];
const voices = [{ value: "mock-voice-1", label: "自然亲和女声" }, { value: "mock-voice-2", label: "清晰活力男声" }];

export function CreateVideoForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [script, setScript] = useState<GeneratedScript>();
  const [productId, setProductId] = useState<string>();
  const [busy, setBusy] = useState<"upload" | "script" | "submit">();
  const [error, setError] = useState("");
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      sellingPoints: [{ value: "" }],
      language: "zh-CN",
      aspectRatio: "9:16",
      durationSeconds: 15,
      avatarId: avatars[0].value,
      voiceId: voices[0].value,
    },
  });
  const points = useFieldArray({ control: form.control, name: "sellingPoints" });

  function chooseFiles(list: FileList | null) {
    setError("");
    const selected = Array.from(list || []);
    if (selected.length < 1 || selected.length > 5) return setError("请选择1～5张商品图片");
    for (const file of selected) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("仅支持 JPG、PNG、WEBP，禁止 SVG");
      if (file.size > MAX_IMAGE_BYTES) return setError(`图片 ${file.name} 超过10MB`);
    }
    setFiles(selected);
  }

  async function ensureProductAndUploads(values: FormValues) {
    if (productId) return productId;
    if (files.length < 1) throw new Error("请先选择1～5张商品图片");
    setBusy("upload");
    const productResponse = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        description: values.description,
        sellingPoints: values.sellingPoints.map((point) => point.value),
      }),
    });
    const product = await productResponse.json() as { id?: string; error?: string };
    if (!productResponse.ok || !product.id) throw new Error(product.error || "创建商品失败");

    const metadata = files.map((file) => ({ name: file.name, type: file.type, size: file.size }));
    const signResponse = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, files: metadata }),
    });
    const signed = await signResponse.json() as { uploads?: Array<{ path: string; token: string }>; error?: string };
    if (!signResponse.ok || !signed.uploads) throw new Error(signed.error || "创建上传地址失败");
    const supabase = createClient();
    for (const [index, upload] of signed.uploads.entries()) {
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .uploadToSignedUrl(upload.path, upload.token, files[index], { contentType: files[index].type });
      if (uploadError) throw new Error(`第${index + 1}张图片上传失败：${uploadError.message}`);
    }
    const completeResponse = await fetch("/api/uploads/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        files: signed.uploads.map((upload, index) => ({
          path: upload.path,
          type: files[index].type,
          size: files[index].size,
        })),
      }),
    });
    const completed = await completeResponse.json() as { error?: string };
    if (!completeResponse.ok) throw new Error(completed.error || "验证上传失败");
    setProductId(product.id);
    return product.id;
  }

  async function generate(values: FormValues) {
    setError("");
    try {
      await ensureProductAndUploads(values);
      setBusy("script");
      const response = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: values.name,
          description: values.description,
          sellingPoints: values.sellingPoints.map((point) => point.value),
          language: values.language,
          durationSeconds: values.durationSeconds,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error((result as { error?: string }).error || "脚本生成失败");
      setScript(generatedScriptSchema.parse(result));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
    } finally {
      setBusy(undefined);
    }
  }

  async function submit(values: FormValues) {
    if (!script || !productId) return setError("请先生成并确认脚本");
    if (!window.confirm(`将提交1条${values.durationSeconds}秒视频任务。Mock模式不产生费用，确认继续吗？`)) return;
    setBusy("submit");
    setError("");
    try {
      const response = await fetch("/api/video-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          language: values.language,
          aspectRatio: values.aspectRatio,
          durationSeconds: values.durationSeconds,
          avatarId: values.avatarId,
          voiceId: values.voiceId,
          script,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const result = await response.json() as { jobId?: string; error?: string };
      if (!response.ok || !result.jobId) throw new Error(result.error || "创建视频任务失败");
      router.push(`/dashboard/jobs/${result.jobId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "提交失败");
      setBusy(undefined);
    }
  }

  const locked = Boolean(script);
  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(script ? submit : generate)}>
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <Card>
        <CardHeader><p className="text-sm font-black text-coral">01 · 商品资料</p><h2 className="mt-1 text-2xl font-black">告诉 AI 你在卖什么</h2></CardHeader>
        <CardContent className="grid gap-5">
          <div><Label>商品名称</Label><Input disabled={locked} {...form.register("name")} />{form.formState.errors.name && <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>}</div>
          <div><Label>商品描述</Label><Textarea disabled={locked} {...form.register("description")} /></div>
          <div>
            <Label>商品卖点</Label>
            <div className="space-y-2">
              {points.fields.map((field, index) => (
                <div className="flex gap-2" key={field.id}>
                  <Input disabled={locked} placeholder={`卖点 ${index + 1}`} {...form.register(`sellingPoints.${index}.value`)} />
                  {!locked && points.fields.length > 1 && <Button type="button" variant="ghost" onClick={() => points.remove(index)}><Trash2 className="size-4" /></Button>}
                </div>
              ))}
            </div>
            {!locked && points.fields.length < 10 && <Button className="mt-2" type="button" variant="ghost" size="sm" onClick={() => points.append({ value: "" })}><Plus className="size-4" />添加卖点</Button>}
          </div>
          <div>
            <Label>商品图片（1～5张，每张最大10MB）</Label>
            <label className={`grid min-h-32 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-black/15 bg-black/[0.02] text-center ${locked ? "pointer-events-none opacity-60" : "hover:border-coral"}`}>
              <input className="sr-only" type="file" multiple accept=".jpg,.jpeg,.png,.webp" disabled={locked} onChange={(event) => chooseFiles(event.target.files)} />
              <span><ImagePlus className="mx-auto mb-2 text-coral" /><strong>选择商品图片</strong><small className="mt-1 block text-black/45">禁止 SVG 和可执行文件</small></span>
            </label>
            {previews.length > 0 && <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{previews.map(({ file, url }) => <img key={`${file.name}-${file.size}`} src={url} alt={file.name} className="aspect-square rounded-xl object-cover" />)}</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><p className="text-sm font-black text-coral">02 · 视频设置</p><h2 className="mt-1 text-2xl font-black">选择画面与声音</h2></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <SelectField label="视频语言" disabled={locked} options={languages} registration={form.register("language")} />
          <SelectField label="视频比例" disabled={locked} options={[{ value: "9:16", label: "9:16 竖屏" }, { value: "1:1", label: "1:1 方形" }, { value: "16:9", label: "16:9 横屏" }]} registration={form.register("aspectRatio")} />
          <SelectField label="视频时长" disabled={locked} options={[{ value: "5", label: "5秒" }, { value: "10", label: "10秒" }, { value: "15", label: "15秒" }]} registration={form.register("durationSeconds", { valueAsNumber: true })} />
          <SelectField label="数字人物" disabled={locked} options={avatars} registration={form.register("avatarId")} />
          <SelectField label="声音" disabled={locked} options={voices} registration={form.register("voiceId")} />
          <div className="rounded-2xl bg-lime/35 p-4 text-sm leading-6"><strong>预计消耗</strong><br />Mock模式：0 Credits · 仅生成1条视频</div>
        </CardContent>
      </Card>

      {script && (
        <Card>
          <CardHeader><p className="text-sm font-black text-coral">03 · 脚本确认</p><h2 className="mt-1 text-2xl font-black">提交前编辑口播</h2><p className="mt-2 text-sm text-black/50">已生成约 {script.estimatedDurationSeconds} 秒脚本。请确认事实准确。</p></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>视频标题</Label><Input value={script.title} onChange={(event) => setScript({ ...script, title: event.target.value })} /></div>
            <div><Label>开场钩子</Label><Input value={script.hook} onChange={(event) => setScript({ ...script, hook: event.target.value })} /></div>
            <div><Label>完整口播</Label><Textarea className="min-h-40 text-base leading-7" value={script.script} onChange={(event) => setScript({ ...script, script: event.target.value })} /></div>
            <div><Label>行动号召</Label><Input value={script.callToAction} onChange={(event) => setScript({ ...script, callToAction: event.target.value })} /></div>
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-4 rounded-2xl border border-black/10 bg-white/90 p-4 shadow-soft backdrop-blur">
        <Button type="submit" className="w-full" size="lg" disabled={Boolean(busy)}>
          {busy ? <LoaderCircle className="size-5 animate-spin" /> : script ? <Video className="size-5" /> : <Sparkles className="size-5" />}
          {busy === "upload" ? "上传并验证图片…" : busy === "script" ? "正在生成脚本…" : busy === "submit" ? "正在提交任务…" : script ? "确认生成一条视频" : "生成口播脚本"}
        </Button>
      </div>
    </form>
  );
}

function SelectField({ label, options, registration, disabled }: {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  registration: ReturnType<ReturnType<typeof useForm<FormValues>>["register"]>;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select className="field min-h-11" disabled={disabled} {...registration}>
        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}
