"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Download, LoaderCircle, Play, RefreshCw, Save, ScrollText } from "lucide-react";
import type { ConceptsResponse, GenerationJob, Product, VideoConcept } from "@/schemas";

interface Payload {
  product: Product;
  job: GenerationJob;
  concepts: ConceptsResponse | null;
}

const labels: Record<GenerationJob["status"], string> = {
  uploaded: "素材已上传",
  analyzing: "分析商品",
  scripting: "生成创意与分镜",
  generating_presenter: "生成数字人口播",
  generating_voice: "生成配音与字幕",
  composing: "合成视频",
  validating: "验证输出",
  completed: "生成完成",
  failed: "生成失败",
};

export function Workbench({ initial }: { initial: Payload }) {
  const [data, setData] = useState(initial);
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState<string>();
  const [draft, setDraft] = useState("");
  const [branchSelections, setBranchSelections] = useState<Record<string, "a" | "b">>({});
  const autoStarted = useRef(false);
  const active = !["completed", "failed", "uploaded"].includes(data.job.status);
  const needsHeygenCredit = Boolean(
    data.job.error?.includes("HeyGen API 余额不足") ||
    data.job.error?.includes("insufficient_credit"),
  );

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/products/${initial.product.id}`, { cache: "no-store" });
    if (response.ok) setData((await response.json()) as Payload);
  }, [initial.product.id]);

  const generate = useCallback(async (body: { conceptId?: string; regenerateConcepts?: boolean } = {}) => {
    setActionError("");
    const response = await fetch(`/api/products/${initial.product.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) setActionError(result.error || "无法启动任务");
    else setTimeout(refresh, 400);
  }, [initial.product.id, refresh]);

  useEffect(() => {
    if (data.job.status === "uploaded" && !autoStarted.current) {
      autoStarted.current = true;
      if (
        data.product.presenter?.enabled &&
        !window.confirm("开始生成会调用 HeyGen 公共数字人并消耗 API 额度，确定继续吗？")
      ) return;
      void generate({ regenerateConcepts: true });
    }
  }, [data.job.status, data.product.presenter?.enabled, generate]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => void refresh(), 1800);
    return () => clearInterval(timer);
  }, [active, refresh]);

  const conceptById = useMemo(() => new Map(data.concepts?.concepts.map((concept) => [concept.id, concept]) || []), [data.concepts]);

  async function saveConcept(conceptId: string) {
    setActionError("");
    try {
      const value = JSON.parse(draft) as VideoConcept;
      const response = await fetch(`/api/products/${data.product.id}/concepts/${conceptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "保存失败");
      setEditing(undefined);
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "JSON 格式错误");
    }
  }

  async function generateBranch(concept: VideoConcept) {
    const choiceId = branchSelections[concept.id];
    if (!choiceId) return setActionError("请先选择 A 或 B");
    if (data.product.presenter?.enabled && !window.confirm("重新生成此分支会消耗一次 HeyGen 视频额度，确定继续吗？")) return;
    setActionError("");
    const response = await fetch(`/api/products/${data.product.id}/concepts/${concept.id}/branch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choiceId }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) setActionError(result.error || "互动分支生成失败");
    else setTimeout(refresh, 400);
  }

  return (
    <div className="space-y-8">
      <section className="panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className={`grid size-10 place-items-center rounded-full ${data.job.status === "failed" ? "bg-red-100 text-red-600" : data.job.status === "completed" ? "bg-lime text-ink" : "bg-coral/10 text-coral"}`}>
                {active ? <LoaderCircle className="size-5 animate-spin" /> : data.job.status === "failed" ? <AlertTriangle className="size-5" /> : <Check className="size-5" />}
              </span>
              <div><p className="text-sm text-black/45">当前状态</p><h2 className="text-xl font-black">{labels[data.job.status]}</h2></div>
            </div>
            <p className="mt-4 text-sm text-black/60">{data.job.currentMessage}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-black/35">
              AI: {data.job.provider}{data.job.avatarProvider ? ` · Avatar: ${data.job.avatarProvider}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="btn-secondary gap-2"
              disabled={active}
              onClick={() => {
                if (data.product.presenter?.enabled && !window.confirm("重新生成全部候选会消耗 HeyGen 视频额度，确定继续吗？")) return;
                void generate({ regenerateConcepts: true });
              }}
            >
              <RefreshCw className="size-4" /> 重新生成全部
            </button>
          </div>
        </div>
        <div className="mt-7 h-3 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-coral transition-all duration-500" style={{ width: `${data.job.progress}%` }} /></div>
        <div className="mt-2 text-right text-sm font-bold">{data.job.progress}%</div>
        {data.job.error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"><strong>具体错误：</strong>{data.job.error}</div>}
        {needsHeygenCredit && (
          <a
            className="btn-primary mt-4 inline-flex"
            href="https://app.heygen.com/developers/api"
            target="_blank"
            rel="noreferrer"
          >
            前往 HeyGen 充值
          </a>
        )}
        {data.product.presenter?.enabled && (
          <div className="mt-5 rounded-2xl border border-coral/20 bg-coral/5 p-4 text-sm leading-6 text-black/65">
            公共数字人：<strong>{data.product.presenter.avatarName}</strong>。人物画面和声音由同一次 HeyGen 渲染产生；手动重新生成会再次消耗 HeyGen 视频额度。
          </div>
        )}
        {actionError && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{actionError}</div>}
      </section>

      {data.concepts && (
        <section>
          <div className="mb-5 flex items-end justify-between"><div><p className="text-sm font-bold text-coral">CREATIVE DIRECTIONS</p><h2 className="mt-1 text-3xl font-black">三套候选创意</h2></div><a className="btn-secondary gap-2" href={fileUrl(data.product.id, "concepts/response.json", true)}><Download className="size-4" /> 全部 JSON</a></div>
          <div className="grid gap-5 lg:grid-cols-3">
            {data.concepts.concepts.map((concept, index) => (
              <article key={concept.id} className="panel flex flex-col p-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-coral">{["A · 痛点开场型", "B · 核心卖点型", "C · 使用场景型"][index]}</p>
                <h3 className="mt-3 text-xl font-black">{concept.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-black/55">{concept.creativeDirection}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button className="btn-secondary gap-2 px-4 py-2 text-sm" disabled={active} onClick={() => { setEditing(concept.id); setDraft(JSON.stringify(concept, null, 2)); }}><ScrollText className="size-4" /> 查看/修改</button>
                  <button
                    className="btn-secondary gap-2 px-4 py-2 text-sm"
                    disabled={active}
                    onClick={() => {
                      if (data.product.presenter?.enabled && !window.confirm("只重生成此候选会消耗一次 HeyGen 视频额度，确定继续吗？")) return;
                      void generate({ conceptId: concept.id, regenerateConcepts: false });
                    }}
                  >
                    <RefreshCw className="size-4" /> 只重生成
                  </button>
                </div>
                <div className="mt-3 flex gap-3 text-xs font-semibold">
                  <a className="text-coral hover:underline" href={fileUrl(data.product.id, `concepts/${concept.id}-script.json`, true)}>脚本 JSON</a>
                  <a className="text-coral hover:underline" href={fileUrl(data.product.id, `concepts/${concept.id}-storyboard.json`, true)}>分镜 JSON</a>
                  <a className="text-coral hover:underline" href={fileUrl(data.product.id, `subtitles/${concept.id}.srt`, true)}>字幕 SRT</a>
                </div>
                {concept.interaction && (
                  <div className="mt-5 rounded-2xl bg-cream/80 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-coral">{concept.interaction.template} · 二选一互动</p>
                    <p className="mt-2 text-sm font-bold leading-6">{concept.interaction.prompt}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {concept.interaction.choices.map((choice) => {
                        const selected = branchSelections[concept.id] === choice.id;
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${selected ? "border-coral bg-coral text-white" : "border-black/10 bg-white"}`}
                            onClick={() => setBranchSelections((old) => ({ ...old, [concept.id]: choice.id }))}
                          >
                            <strong>{choice.id.toUpperCase()}</strong> · {choice.label}
                          </button>
                        );
                      })}
                    </div>
                    {branchSelections[concept.id] && (() => {
                      const choice = concept.interaction!.choices.find((item) => item.id === branchSelections[concept.id]);
                      return choice ? (
                        <div className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-black/60">
                          <strong className="text-ink">分支预览：</strong>{choice.followupText}<br />CTA：{choice.cta}
                        </div>
                      ) : null;
                    })()}
                    <button className="btn-primary mt-3 w-full py-2.5 text-sm" disabled={active || !branchSelections[concept.id]} onClick={() => void generateBranch(concept)}>
                      生成所选分支
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {editing && conceptById.has(editing) && (
        <section className="panel p-6 sm:p-8">
          <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-coral">SCRIPT EDITOR</p><h2 className="mt-1 text-2xl font-black">修改结构化脚本与分镜</h2></div><button className="btn-secondary" onClick={() => setEditing(undefined)}>关闭</button></div>
          <p className="mt-3 text-sm text-black/50">保存时会用 Zod 校验完整结构，并只重新配音、字幕和合成当前候选。</p>
          <textarea className="field mt-5 min-h-[32rem] font-mono text-sm leading-6" spellCheck={false} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button className="btn-primary mt-4 gap-2" onClick={() => void saveConcept(editing)}><Save className="size-4" /> 保存并重新合成</button>
        </section>
      )}

      {data.job.outputs.length > 0 && (
        <section>
          <p className="text-sm font-bold text-coral">FINAL OUTPUTS</p>
          <h2 className="mt-1 text-3xl font-black">候选视频</h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-3">
            {data.job.outputs.sort((a, b) => a.conceptId.localeCompare(b.conceptId)).map((output) => (
              <article className="panel overflow-hidden p-3" key={output.conceptId}>
                <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-ink">
                  <video className="h-full w-full object-contain" controls playsInline preload="metadata" src={fileUrl(data.product.id, output.videoPath)} />
                  <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white"><Play className="mr-1 inline size-3" />1080 × 1920</span>
                </div>
                <div className="p-3"><h3 className="truncate font-black">{output.title}</h3><a className="btn-primary mt-3 w-full gap-2 py-2.5 text-sm" href={fileUrl(data.product.id, output.videoPath, true)}><Download className="size-4" /> 下载 MP4</a></div>
                {output.presenterName && <p className="px-3 pb-3 text-xs font-semibold text-coral">数字人：{output.presenterName} · 口型同步原音</p>}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function fileUrl(productId: string, path: string, download = false) {
  return `/api/products/${productId}/files/${path.split("/").map(encodeURIComponent).join("/")}${download ? "?download=1" : ""}`;
}
