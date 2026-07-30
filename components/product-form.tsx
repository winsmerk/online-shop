"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Minus, Plus, Upload } from "lucide-react";
import type { AvatarLook, ProductInput } from "@/schemas";

const defaults: ProductInput = {
  name: "",
  category: "",
  description: "",
  sellingPoints: ["", "", ""],
  targetAudience: "",
  price: "",
  callToAction: "立即了解并购买",
  platforms: ["douyin"],
  language: "简体中文",
  duration: 20,
  brandName: "",
  brandColor: "#FF6B4A",
};

export function ProductForm() {
  const router = useRouter();
  const [value, setValue] = useState(defaults);
  const [images, setImages] = useState<File[]>([]);
  const [logo, setLogo] = useState<File>();
  const [music, setMusic] = useState<File>();
  const [animalFile, setAnimalFile] = useState<File>();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [avatars, setAvatars] = useState<AvatarLook[]>([]);
  const [avatarMessage, setAvatarMessage] = useState("正在检查 HeyGen 配置…");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/avatars/heygen", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as { configured?: boolean; avatars?: AvatarLook[]; message?: string; error?: string };
        if (cancelled) return;
        setAvatars(result.avatars || []);
        setAvatarMessage(
          result.error ||
          result.message ||
          (result.avatars?.length ? `已加载 ${result.avatars.length} 个公共数字人` : "HeyGen 当前没有可用公共数字人"),
        );
      })
      .catch(() => !cancelled && setAvatarMessage("无法读取 HeyGen 数字人列表"));
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof ProductInput>(key: K, next: ProductInput[K]) => setValue((old) => ({ ...old, [key]: next }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!images.length) return setError("请至少上传一张商品图片（建议 3 张以上）");
    if (value.animal?.enabled && !animalFile) return setError("启用动物角色后，请上传动物角色图片");
    setSubmitting(true);
    try {
      const data = new FormData();
      data.set("product", JSON.stringify({ ...value, sellingPoints: value.sellingPoints.filter(Boolean) }));
      images.forEach((file) => data.append("productImages", file));
      if (logo) data.set("logo", logo);
      if (music) data.set("music", music);
      if (animalFile) data.set("animal", animalFile);
      const response = await fetch("/api/products", { method: "POST", body: data });
      const result = (await response.json()) as { productId?: string; error?: string };
      if (!response.ok || !result.productId) throw new Error(result.error || "创建失败");
      router.push(`/products/${result.productId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "创建失败");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <section className="panel p-6 sm:p-8">
        <h2 className="text-xl font-black">商品资料</h2>
        <p className="mt-1 text-sm text-black/50">资料越具体，脚本中的卖点和使用场景越准确。</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="商品名称"><input className="field" required maxLength={100} value={value.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="商品类别"><input className="field" required value={value.category} onChange={(e) => set("category", e.target.value)} /></Field>
          <Field label="商品简介" wide><textarea className="field min-h-28 resize-y" required minLength={10} value={value.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="目标用户"><input className="field" required value={value.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} /></Field>
          <Field label="商品价格"><input className="field" required placeholder="例如：¥129 / 限时 ¥99" value={value.price} onChange={(e) => set("price", e.target.value)} /></Field>
          <Field label="行动号召"><input className="field" required value={value.callToAction} onChange={(e) => set("callToAction", e.target.value)} /></Field>
          <Field label="品牌名称"><input className="field" required value={value.brandName} onChange={(e) => set("brandName", e.target.value)} /></Field>
          <Field label="品牌颜色">
            <div className="flex gap-3"><input type="color" className="h-12 w-16 rounded-xl border border-black/10 bg-white p-1" value={value.brandColor} onChange={(e) => set("brandColor", e.target.value)} /><input className="field" pattern="^#[0-9a-fA-F]{6}$" value={value.brandColor} onChange={(e) => set("brandColor", e.target.value)} /></div>
          </Field>
        </div>
      </section>

      <section className="panel p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="text-xl font-black">动物角色与互动</h2>
            <p className="mt-1 text-sm text-black/50">上传品牌吉祥物或动物角色，使用本地 FFmpeg 动作，不产生额外 API 费用。</p>
          </div>
          <label className={`flex cursor-pointer items-center gap-3 rounded-full border px-5 py-3 font-semibold ${value.animal?.enabled ? "border-ink bg-ink text-white" : "border-black/15 bg-white"}`}>
            <input
              type="checkbox"
              className="size-4"
              checked={Boolean(value.animal?.enabled)}
              onChange={(event) =>
                set(
                  "animal",
                  event.target.checked
                    ? {
                        enabled: true,
                        name: "小搭档",
                        personality: "活泼、好奇、会用表情回应主持人",
                        motion: "auto",
                        interactionTemplate: "auto",
                        choiceA: "更看重实用功能",
                        choiceB: "更看重外观设计",
                      }
                    : undefined,
                )
              }
            />
            {value.animal?.enabled ? "已启用" : "启用动物角色"}
          </label>
        </div>
        {value.animal?.enabled && (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="角色名称"><input className="field" required value={value.animal.name} onChange={(event) => set("animal", { ...value.animal!, name: event.target.value })} /></Field>
            <Field label="角色性格"><input className="field" required value={value.animal.personality} onChange={(event) => set("animal", { ...value.animal!, personality: event.target.value })} /></Field>
            <Field label="本地动作">
              <select className="field" value={value.animal.motion} onChange={(event) => set("animal", { ...value.animal!, motion: event.target.value as NonNullable<ProductInput["animal"]>["motion"] })}>
                <option value="auto">自动选择</option>
                <option value="bounce">弹跳</option>
                <option value="slide_in">滑入</option>
                <option value="sway">摇摆</option>
                <option value="pulse">呼吸缩放</option>
                <option value="peek">探头</option>
              </select>
            </Field>
            <Field label="互动模板">
              <select className="field" value={value.animal.interactionTemplate} onChange={(event) => set("animal", { ...value.animal!, interactionTemplate: event.target.value as NonNullable<ProductInput["animal"]>["interactionTemplate"] })}>
                <option value="auto">三条候选分别使用三种模板</option>
                <option value="quiz">问题竞猜</option>
                <option value="dialogue">主持人与动物对话</option>
                <option value="challenge">商品挑战</option>
              </select>
            </Field>
            <Field label="选项 A"><input className="field" required value={value.animal.choiceA} onChange={(event) => set("animal", { ...value.animal!, choiceA: event.target.value })} /></Field>
            <Field label="选项 B"><input className="field" required value={value.animal.choiceB} onChange={(event) => set("animal", { ...value.animal!, choiceB: event.target.value })} /></Field>
            <div className="md:col-span-2">
              <UploadField
                label="动物角色图片"
                icon={<ImagePlus />}
                accept=".jpg,.jpeg,.png,.webp"
                onFiles={(files) => setAnimalFile(files[0])}
                detail={animalFile?.name || "推荐透明背景 PNG，单张不超过 10MB"}
              />
            </div>
          </div>
        )}
      </section>

      <section className="panel p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div><h2 className="text-xl font-black">核心卖点</h2><p className="mt-1 text-sm text-black/50">最多 10 条，系统会进一步提炼。</p></div>
          <button type="button" className="btn-secondary gap-2" disabled={value.sellingPoints.length >= 10} onClick={() => set("sellingPoints", [...value.sellingPoints, ""])}><Plus className="size-4" /> 添加</button>
        </div>
        <div className="mt-5 space-y-3">
          {value.sellingPoints.map((point, index) => (
            <div className="flex gap-3" key={index}>
              <input className="field" required value={point} placeholder={`卖点 ${index + 1}`} onChange={(e) => set("sellingPoints", value.sellingPoints.map((item, i) => i === index ? e.target.value : item))} />
              <button aria-label="删除卖点" type="button" className="grid size-12 shrink-0 place-items-center rounded-xl border border-black/10 bg-white" disabled={value.sellingPoints.length === 1} onClick={() => set("sellingPoints", value.sellingPoints.filter((_, i) => i !== index))}><Minus className="size-4" /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6 sm:p-8">
        <h2 className="text-xl font-black">视频设置</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="目标平台" wide>
            <div className="flex flex-wrap gap-3">
              {([["tiktok", "TikTok"], ["douyin", "抖音"], ["xiaohongshu", "小红书"]] as const).map(([id, label]) => (
                <label key={id} className={`cursor-pointer rounded-full border px-5 py-2.5 font-semibold ${value.platforms.includes(id) ? "border-ink bg-ink text-white" : "border-black/15 bg-white"}`}>
                  <input type="checkbox" className="sr-only" checked={value.platforms.includes(id)} onChange={() => set("platforms", value.platforms.includes(id) ? value.platforms.filter((p) => p !== id) : [...value.platforms, id])} />{label}
                </label>
              ))}
            </div>
          </Field>
          <Field label="视频语言"><input className="field" value={value.language} onChange={(e) => set("language", e.target.value)} /></Field>
          <Field label="视频时长"><select className="field" value={value.duration} onChange={(e) => set("duration", Number(e.target.value) as 15 | 20 | 30)}><option value={15}>15 秒</option><option value={20}>20 秒</option><option value={30}>30 秒</option></select></Field>
        </div>
      </section>

      <section className="panel p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="text-xl font-black">公共数字人出镜</h2>
            <p className="mt-1 text-sm text-black/50">由 HeyGen 生成真人口播，最终使用数字人视频的原始音轨，确保配音和口型同步。</p>
          </div>
          <label className={`flex cursor-pointer items-center gap-3 rounded-full border px-5 py-3 font-semibold ${value.presenter?.enabled ? "border-coral bg-coral text-white" : "border-black/15 bg-white"}`}>
            <input
              type="checkbox"
              className="size-4"
              disabled={!avatars.length}
              checked={Boolean(value.presenter?.enabled)}
              onChange={(event) => {
                const avatar = avatars[0];
                set(
                  "presenter",
                  event.target.checked && avatar
                    ? { enabled: true, provider: "heygen", avatarId: avatar.id, avatarName: avatar.name, previewImageUrl: avatar.preview_image_url }
                    : undefined,
                );
              }}
            />
            {value.presenter?.enabled ? "已启用" : "启用数字人"}
          </label>
        </div>
        <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${avatars.length ? "bg-lime/30 text-black/65" : "bg-amber-50 text-amber-800"}`}>{avatarMessage}</p>
        {avatars.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {avatars.slice(0, 15).map((avatar) => {
              const selected = value.presenter?.enabled && value.presenter.avatarId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  disabled={!value.presenter?.enabled}
                  onClick={() => set("presenter", { enabled: true, provider: "heygen", avatarId: avatar.id, avatarName: avatar.name, previewImageUrl: avatar.preview_image_url })}
                  className={`overflow-hidden rounded-2xl border-2 bg-white text-left transition ${selected ? "border-coral shadow-soft" : "border-transparent"} disabled:cursor-not-allowed disabled:opacity-55`}
                >
                  <span className="block aspect-[4/5] bg-cover bg-center" style={{ backgroundImage: `url("${avatar.preview_image_url}")` }} />
                  <span className="block truncate px-3 py-2 text-sm font-bold">{avatar.name}</span>
                </button>
              );
            })}
          </div>
        )}
        {value.presenter?.enabled && (
          <p className="mt-4 text-xs leading-5 text-black/45">每个候选会调用一次 HeyGen 视频生成 API，生成三条候选将消耗三次数字人视频额度。</p>
        )}
      </section>

      <section className="panel p-6 sm:p-8">
        <h2 className="text-xl font-black">商品素材</h2>
        <p className="mt-1 text-sm text-black/50">JPG / PNG / WEBP 单张不超过 10MB；MP3 / WAV 不超过 20MB。</p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <UploadField label="商品图片（1～8 张）" icon={<ImagePlus />} accept=".jpg,.jpeg,.png,.webp" multiple onFiles={(files) => setImages(Array.from(files).slice(0, 8))} detail={images.length ? `已选择 ${images.length} 张` : "建议上传至少 3 个角度"} />
          <UploadField label="品牌 Logo（可选）" icon={<Upload />} accept=".jpg,.jpeg,.png,.webp" onFiles={(files) => setLogo(files[0])} detail={logo?.name || "透明 PNG 效果最佳"} />
          <UploadField label="背景音乐（可选）" icon={<Upload />} accept=".mp3,.wav" onFiles={(files) => setMusic(files[0])} detail={music?.name || "系统会自动降低音量"} />
        </div>
      </section>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 font-medium text-red-700">{error}</div>}
      <button className="btn-primary w-full gap-2 py-4 text-lg" disabled={submitting}>{submitting ? <LoaderCircle className="size-5 animate-spin" /> : <ClapperIcon />} {submitting ? "正在保存素材…" : "创建商品并进入生成工作台"}</button>
    </form>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? "md:col-span-2" : ""}><span className="label">{label}</span>{children}</label>;
}

function UploadField({ label, accept, multiple, onFiles, detail, icon }: { label: string; accept: string; multiple?: boolean; onFiles: (files: FileList) => void; detail: string; icon: React.ReactNode }) {
  return (
    <label className="grid min-h-44 cursor-pointer place-items-center rounded-2xl border border-dashed border-black/20 bg-cream/60 p-5 text-center transition hover:border-coral hover:bg-coral/5">
      <input type="file" className="sr-only" accept={accept} multiple={multiple} onChange={(e) => e.target.files && onFiles(e.target.files)} />
      <span><span className="mx-auto grid size-11 place-items-center rounded-full bg-white text-coral">{icon}</span><strong className="mt-3 block">{label}</strong><span className="mt-2 block max-w-48 truncate text-sm text-black/50">{detail}</span></span>
    </label>
  );
}

function ClapperIcon() {
  return <span aria-hidden>✦</span>;
}
