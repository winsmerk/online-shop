import { CreateVideoForm } from "@/components/create-video-form";

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm font-black uppercase tracking-widest text-coral">Create</p>
      <h1 className="mt-1 text-4xl font-black">创建商品视频</h1>
      <p className="mt-3 max-w-2xl leading-7 text-black/55">上传真实商品图，生成并确认15秒内口播，再提交一条异步数字人视频任务。</p>
      <div className="mt-8"><CreateVideoForm /></div>
    </div>
  );
}
