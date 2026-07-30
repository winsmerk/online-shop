# AI 商品宣传视频网站

当前主应用是一个面向多用户的异步商品视频网站：Supabase Auth 负责账号与会话，PostgreSQL + RLS 保存商品和任务归属，私有 Storage 仅保存商品图片，OpenAI/Mock 生成15秒内口播，统一 `VideoProvider` 创建单条异步视频。第一阶段默认 `VIDEO_PROVIDER=mock`，不调用真实 Vidnoz，也不产生视频 API 费用。

旧版 HeyGen + FFmpeg 三候选本地 MVP 仍保留在 `/products/*` 及原有模块中，便于回溯用户已有任务；新 `/dashboard/*` 流程不会把永久数据或生成视频写入本地文件系统。

## 新版功能（阶段1～5）

- 用户名 + 密码登录；密码仅由 Supabase Auth 保存，`profiles` 不复制密码字段。
- 默认关闭自行注册；管理员运行脚本创建首个 `admin`，再在后台添加用户或重置密码。
- 用户可自行修改密码。
- 私有 `product-images` bucket，1～5张 JPG/PNG/WEBP，每张最大10MB。
- 浏览器使用短时 signed upload token 直传 Supabase；服务端再次验证归属、路径、大小、MIME和文件魔数。
- Mock/OpenAI `ScriptProvider`，严格 JSON + Zod；OpenAI结构失败自动修复一次。
- 口播脚本提交前可编辑确认，时长只能是5/10/15秒。
- 每次只创建一条视频；统一状态为 `draft → uploading → script_generating → ready → submitted → processing → completed/failed/canceled`。
- Mock `VideoProvider` 支持创建、状态查询、游标分页、详情和临时播放地址，完整模拟异步进度。
- 用户任务历史、分页、详情、轮询、失败原因、最多3次重试、播放和下载。
- 本地 `video_jobs.user_id` 是唯一授权依据；普通用户没有任何“列出Provider账户全部视频”的API。
- 每用户最多2条并发任务、每小时最多10条、UUID幂等键防重复提交。
- Cron同步接口已提供并验证 `CRON_SECRET`；真实 Vidnoz Webhook 留到阶段6～7。

## 快速启动新版

要求 Node.js 20+、npm 10+、Docker（本地 Supabase CLI）以及 Supabase CLI。先安装依赖：

```bash
npm install
cp .env.example .env.local
```

推荐本地 Supabase：

```bash
npx supabase start
npx supabase db reset
```

将 `supabase start` 输出的 API URL、anon key 和 service_role key 填入 `.env.local`：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

ADMIN_USERNAME=admin
ADMIN_PASSWORD=请替换为至少8位强密码
VIDEO_PROVIDER=mock
APP_URL=http://localhost:3000
CRON_SECRET=请替换为长随机字符串
```

创建默认管理员并启动：

```bash
npm run create:admin
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，使用 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 登录。管理员可访问 `/dashboard/admin/users` 创建其他账号和重置密码。

> Supabase Auth 原生使用 email + password。为了提供“用户名 + 密码”界面，服务端将规范化用户名映射为不可投递的内部地址 `{username}@users.invalid`。用户名仍是业务和界面唯一标识，系统不发送邮件，也不开放自行注册。

## Supabase migration 与数据模型

Migration 位于：

```text
supabase/migrations/202607300001_initial_schema.sql
```

它会创建 `profiles`、`products`、`product_assets`、`video_jobs`、索引、更新时间触发器、用户资料触发器、全部RLS策略，以及唯一的私有 `product-images` bucket。不会创建 `video_outputs` 或 `generated-videos`。

本地应用 migration：

```bash
npx supabase db reset
```

远程项目（先正确执行 `supabase link`）：

```bash
npx supabase db push
```

不要在Vercel构建期间执行migration。Service Role Key只允许配置在服务端运行环境。

## 新版环境变量

| 变量 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase项目URL，可公开 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key，可公开，由RLS限制 |
| `SUPABASE_SERVICE_ROLE_KEY` | 管理员建用户/Cron使用，仅服务端 |
| `OPENAI_API_KEY` | 可选；为空自动使用MockScriptProvider |
| `OPENAI_MODEL` | 脚本模型，默认 `gpt-4.1-mini` |
| `VIDEO_PROVIDER` | `mock` 或 `vidnoz`；启用 Vidnoz 前需配置 API Key |
| `VIDNOZ_API_BASE_URL` | Vidnoz Open API 地址，默认 `https://devapi.vidnoz.com` |
| `VIDNOZ_API_KEY` | Vidnoz API Key，仅服务端使用 |
| `VIDNOZ_DEFAULT_AVATAR_ID` / `VIDNOZ_DEFAULT_VOICE_ID` | Vidnoz 人物和声音 ID |
| `CRON_SECRET` | 保护 `/api/cron/sync` |
| `APP_URL` | 当前部署源地址 |
| `VIDEO_URL_CACHE_SECONDS` | 临时视频地址客户端缓存建议值，默认300秒 |

任何私钥都不得使用 `NEXT_PUBLIC_` 前缀。`.env.local` 已加入 `.gitignore`。

## Mock端到端流程

`VIDEO_PROVIDER=mock` 时：

1. 登录后上传并验证商品图片。
2. 生成Mock或OpenAI脚本。
3. 编辑脚本并二次确认。
4. 创建本地 `video_jobs` 记录。
5. Mock状态自动从 `submitted` 变为 `processing`，约4秒后完成。
6. 详情页实时获取 `/public/mock/sample.mp4`，支持播放与下载。

Mock视频是项目脚本生成的自有测试素材。若文件缺失可运行：

```bash
npm run prepare:mock-video
```

## 开发与测试命令

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Playwright首次运行可能需要：

```bash
npx playwright install chromium
```

## Vercel部署准备（本轮不实际部署）

1. 在Supabase生产项目执行 migration，并创建首个管理员。
2. 在Vercel分别为Development、Preview、Production配置对应环境变量。
3. 配置并验证 Vidnoz 后，将 `VIDEO_PROVIDER` 改为 `vidnoz`。
4. Vercel Cron调用 `/api/cron/sync` 时必须带 `Authorization: Bearer <CRON_SECRET>`。
5. 商品图片留在Supabase，视频留在Provider；禁止复制Vidnoz MP4到Supabase。
6. Preview和Production应使用各自的Supabase项目，避免测试数据污染生产。

## Vidnoz Open API 接入

当前已接入官方 Open API 的 avatar-to-video、task/detail 和 video/list 接口。启用前请在 Vidnoz 后台创建 API Credentials，并将 API Key 仅配置到服务端环境变量：

```dotenv
VIDEO_PROVIDER=vidnoz
VIDNOZ_API_BASE_URL=https://devapi.vidnoz.com
VIDNOZ_API_KEY=your-server-only-api-key
VIDNOZ_DEFAULT_AVATAR_ID=your-avatar-id
VIDNOZ_DEFAULT_VOICE_ID=your-voice-id
```

创建视频任务时，系统使用已确认脚本、配置的人物/声音和第一张商品图作为背景；视频任务由 Cron 或任务详情轮询同步，Vidnoz 返回的临时资源链接不会永久复制到本地文件系统或 Supabase。

## 新版当前限制

- Vidnoz 资源链接是临时地址；当前实现使用 Cron/详情请求同步，不实现未经官方协议确认的 Webhook。
- 管理员创建用户和重置密码需要 `SUPABASE_SERVICE_ROLE_KEY`。
- 用户名登录不提供邮件找回；忘记密码由管理员重置。
- Mock临时状态由时间计算，适合开发和测试；生产Vidnoz状态将由Webhook/Cron持久更新。
- 没有支付、套餐、自动发布或生成视频二次存储。

---

## 旧版本地 HeyGen/FFmpeg MVP（保留）

以下内容描述原 `/products/*` 三候选本地工作流，供已有任务继续使用。

## 已实现能力

- 三种固定但内容不同的创意方向：
  - A：痛点开场型
  - B：核心卖点型
  - C：使用场景型
- 每套创意包含标题、15～30 秒口播、逐镜分镜、镜头提示词、配音文案、字幕、发布文案和 Hashtag。
- OpenAI 视觉分析会发送经过缩放的商品图用于理解；生成结果只接受严格 JSON，并经 Zod 校验。
- AI JSON 首次校验失败会自动请求修复一次；再次失败则停止，保存原始响应到任务的 `logs/`，页面显示具体错误。
- 没有 API Key 时自动启用 Mock：生成三套脚本、模拟音轨、字幕和完整 MP4。
- `LocalMotionProvider` 支持缓慢推进、拉远、左右平移、局部放大、淡入淡出、交叉溶解、模糊背景填充和卖点文字动画。
- 可选接入 HeyGen 公共数字人：开场和结尾全屏出镜，中段以画中画方式和商品镜头同屏。最终配音直接使用同一条数字人视频的原始音轨，并对音画做完全一致的等比变速，保持口型同步。
- 原始商品图只做裁剪、缩放与运镜，不重新绘制商品；前景默认使用 `contain`，背景使用放大模糊填充，避免拉伸并尽量保留主体完整。
- 输出规格：1080×1920、9:16、30 FPS、H.264 视频、AAC 音频、MP4、15/20/30 秒。
- 字幕和卖点文字先渲染为透明图层后烧录到安全区域，因此不依赖 FFmpeg 的 `libass` 或 `drawtext` 编译选项；同时单独输出 SRT。
- 支持多素材上传、任务进度、异常提示、脚本 JSON 编辑后重新合成、单候选重生成、全部重生成，以及脚本/分镜/SRT/MP4 下载。
- 支持上传透明动物角色，使用本地 FFmpeg 实现弹跳、滑入、摇摆、呼吸缩放和探头 5 种动作，无需增加付费 API。
- 支持问题竞猜、主持人与动物对话、商品挑战 3 种互动模板；预览页可选择 A/B、查看分支文案，再单独生成所选分支。
- 所有资料与产物使用本地文件系统和 JSON，不需要数据库。

## 环境要求

- Node.js 20 或更高（已在 Node.js 22 测试）
- npm 10 或更高
- FFmpeg 与 FFprobe

检查 FFmpeg：

```bash
ffmpeg -version
ffprobe -version
```

如果尚未安装：

### macOS

```bash
brew install ffmpeg
```

### Windows

推荐使用 winget：

```powershell
winget install Gyan.FFmpeg
```

安装后重新打开终端，确认 `ffmpeg` 和 `ffprobe` 在 PATH 中。也可以从 FFmpeg 官方构建页面下载压缩包，将 `bin` 目录加入系统 PATH。

### Ubuntu / Debian Linux

```bash
sudo apt update
sudo apt install ffmpeg
```

### Fedora Linux

```bash
sudo dnf install ffmpeg
```

若可执行文件不在 PATH 中，可在 `.env` 中设置绝对路径：

```dotenv
FFMPEG_PATH=/absolute/path/to/ffmpeg
FFPROBE_PATH=/absolute/path/to/ffprobe
```

## 安装与启动

```bash
npm install
cp .env.example .env
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

`.env` 中不填写 `OPENAI_API_KEY` 也能使用。此时 `AI_PROVIDER=auto` 会自动选择 Mock 完整流程。

首次建议运行内置 Demo：

```bash
npm run generate:demo
npm run dev
```

命令结束后会打印 Demo 的页面地址。它会实际生成三张示例图、三套创意、音频、字幕和三条 15 秒 MP4，通常需要几十秒到数分钟，取决于 CPU。

## OpenAI 配置

复制 `.env.example` 后配置：

```dotenv
OPENAI_API_KEY=sk-...
AI_PROVIDER=auto
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
```

安全与预算项：

```dotenv
OPENAI_MAX_OUTPUT_TOKENS=8000
OPENAI_REQUEST_TIMEOUT_MS=90000
OPENAI_MAX_RETRIES=2
OPENAI_MAX_CALLS_PER_JOB=10
WORKFLOW_TIMEOUT_MS=600000
```

- API Key 只在服务端从环境变量读取，不带 `NEXT_PUBLIC_` 前缀，不写入任务文件或日志。
- `OPENAI_MAX_CALLS_PER_JOB` 限制单任务 OpenAI 请求总数；三条配音也计入。
- 设为 `AI_PROVIDER=mock` 可以在存在 API Key 时强制使用 Mock。
- 修改 `.env` 后需要重启 `npm run dev`。

## HeyGen 公共数字人配置

数字人是可选能力，不配置时仍使用原有商品图片运镜流程。

1. 在 HeyGen 开发者后台创建 API Key。
2. 在 `.env` 中配置：

```dotenv
HEYGEN_API_KEY=your-server-only-key
# 可选：让指定公共 avatar look 排在创建页第一位
HEYGEN_AVATAR_ID=
HEYGEN_REQUEST_TIMEOUT_MS=90000
HEYGEN_POLL_INTERVAL_MS=5000
HEYGEN_MAX_POLLS=120
HEYGEN_MAX_VIDEOS_PER_JOB=3
```

3. 重启 `npm run dev`。
4. 打开商品创建页，在“公共数字人出镜”区域启用并选择人物。

创建页通过服务端读取 HeyGen 公共 avatar looks，浏览器不会接触 API Key。每个候选视频会发起一次 HeyGen 渲染；默认一个任务最多三次。HeyGen 生成完成后，原始视频下载到：

```text
storage/products/{productId}/scenes/presenter/{conceptId}.mp4
```

系统将数字人视频统一为目标时长和 1080×1920/30 FPS。视频和音频使用相同变速比例，因此不会因本地合成再次产生口型偏移。开场与结尾显示全屏人物，中段显示人物画中画和真实商品图片，字幕、Logo 与卖点文字由本地 FFmpeg 继续合成。

如果启用了数字人但缺少 Key、人物不可用、额度不足、API 超时或远端渲染失败，任务会停止并在页面显示 HeyGen 返回的明确错误；不会静默输出没有人物的候选视频。

## 使用流程

1. 打开首页，点击“创建第一个商品”。
2. 填写商品资料、卖点、平台、语言、时长和品牌信息。
3. 上传 1～8 张 JPG/PNG/WEBP 商品图；建议至少 3 张。Logo 和 MP3/WAV 配乐可选。
4. 提交后进入工作台，任务自动开始。
5. 页面轮询显示 `uploaded → analyzing → scripting → generating_presenter（启用数字人时）→ generating_voice → composing → validating → completed`。
6. 查看三套创意、脚本和分镜，播放或下载最终视频。
7. 可只重新生成某个候选；也可打开结构化 JSON 编辑器修改文案/分镜，保存后仅重做该候选的配音、字幕和合成。
8. 如果启用了动物角色，可在每套创意下点击 A/B 预览对应话术和 CTA，再点击“生成所选分支”。启用 HeyGen 时页面会在消耗一次新额度前确认。

上传限制：

- JPG / PNG / WEBP：单张最大 10MB
- MP3 / WAV：单个最大 20MB
- 商品图最多 8 张
- 动物角色支持 JPG / PNG / WEBP，推荐使用透明背景 PNG

## 动物角色与互动分支

商品创建页可启用“动物角色与互动”，设置：

- 角色名称与性格
- 动作：自动、弹跳、滑入、摇摆、呼吸缩放、探头
- 互动模板：自动、问题竞猜、主持人与动物对话、商品挑战
- A/B 两个观众选项
- 一张动物或品牌吉祥物图片

选择“自动”互动模板时，三条候选分别使用：

1. 问题竞猜：动物向观众提出 A/B 选择。
2. 主持人与动物对话：人物与动物表达不同侧重点。
3. 商品挑战：人物和动物共同发起商品选择挑战。

分镜 JSON 会额外保存 `speaker`、`characterAction`、`interactionCue` 和 `interaction`。A/B 分支不是前端假切换：点击生成后，系统会更新结尾场景、口播、字幕和 CTA，并只重新合成当前候选。

动物图像只在本地处理，不上传到 HeyGen。5 种动作均通过 FFmpeg 参数数组生成；角色默认位于字幕安全区上方，避免遮挡字幕和主要商品信息。

服务端同时校验扩展名、MIME、文件大小与文件头魔数；保存时重新生成 UUID 文件名。

## 开发命令

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run generate:demo
```

## 存储结构

每个商品使用独立 UUID 目录：

```text
storage/products/{productId}/
├── product.json
├── job.json
├── assets/
├── concepts/
│   ├── response.json
│   ├── concept-a-script.json
│   └── concept-a-storyboard.json
├── audio/
├── subtitles/
├── scenes/
├── output/
└── logs/
```

每阶段产物会立即落盘，单候选重新生成会复用已经验证的创意 JSON，不会重新执行商品分析。`storage/products/*` 已加入 `.gitignore`，不会意外提交用户素材。

## 项目结构

```text
app/                     Next.js 页面与 Route Handlers
components/              商品表单和任务工作台
lib/ai/                  OpenAI、Mock 与严格 JSON 解析
lib/audio/               字幕时间轴、SRT 与 ASS 生成
lib/video/               FFmpeg 执行、运镜滤镜、文字图层
lib/workflow/            状态机与可恢复工作流
lib/validation/          上传安全校验
providers/video/         VideoProvider 与 LocalMotionProvider
schemas/                 Product、Scene、Concept、Job、Output 等 Zod Schema
prompts/                 严格结构化生成提示词
scripts/                 完整 Demo 生成器
storage/products/         本地任务数据
tests/                    Schema、上传、AI 解析、FFmpeg、状态与 Mock 测试
```

`VideoProvider` 是第三方图生视频的统一扩展点。后续可新增实现并替换 `LocalMotionProvider`，无需修改上层任务和页面数据结构。

## 测试覆盖

- Zod Schema 与时间轴一致性
- 商品输入校验
- 上传扩展名、MIME、魔数和伪造内容
- AI 自由文本、无效 JSON、结构错误
- 六种 FFmpeg 运镜命令和安全参数
- 工作流合法/非法状态变化
- MockProvider 创意 → 模拟音频 → SRT 端到端产物
- 动物角色 5 种 FFmpeg 动作
- 三种互动模板和 A/B 分支改写
- `npm run generate:demo` 实际视频集成测试

## 当前限制

- 工作流在本地 Next.js Node 进程内异步执行；重启开发服务器会中断正在编码的视频，但已落盘的阶段产物仍保留。生产化应改为持久任务队列和独立 worker。
- 第一版没有数据库、登录、多用户隔离和云存储，适合单机审核工作台，不应直接暴露到公网。
- Mock 模式在 macOS 使用系统中文语音，在 Linux 尝试 `espeak-ng`/`espeak`；系统没有本地 TTS 时才回退为测试音。配置 OpenAI 后可生成更自然的配音。
- HeyGen 公共数字人需要单独的付费 API 额度；Mock 模式不会伪造“真实人物”或宣称具有口型同步。
- 数字人脚本由 HeyGen 的人物默认声音朗读，以该视频原音作为最终主配音；启用数字人时不会再使用 OpenAI TTS 作为主音轨。
- OpenAI 模式目前用视觉模型理解最多前 6 张商品图；最终视频仍只使用原始上传图。
- 没有自动发布 TikTok、抖音或小红书，也没有接入需要浏览器自动化的第三方平台。
- 文字换行使用面向中日韩短文案的近似字符宽度；特别长的英文文案建议在结构化编辑器中缩短。

## 安全说明

- FFmpeg 使用 `spawn(command, args[])`，用户输入不会拼接进 shell 命令。
- 下载接口解析并校验任务根目录，阻止 `../` 路径穿越，并支持视频 Range 请求。
- 不执行上传内容，不接受脚本文件。
- 原始 AI 响应只保存到对应任务的本地 `logs/`，且错误日志会脱敏 API Key。
- `.env` 和生成目录均被 Git 忽略。
