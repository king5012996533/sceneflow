import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Prompt = {
    id: string;
    title: string;
    coverUrl: string;
    prompt: string;
    tags: string[];
    category: string;
    githubUrl: string;
    preview: string;
    createdAt: string;
    updatedAt: string;
};

type PromptCategory = {
    category: string;
    githubUrl: string;
    build: () => Promise<Omit<Prompt, "category" | "githubUrl">[]>;
};

const gptImage2RawBase = "https://raw.githubusercontent.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/main";
const awesomeGptImageRawBase = "https://raw.githubusercontent.com/ZeroLu/awesome-gpt-image/main";
const awesomeGpt4oImagePromptsBase = "https://raw.githubusercontent.com/ImgEdify/Awesome-GPT4o-Image-Prompts/main";
const youMindGptImage2RawBase = "https://raw.githubusercontent.com/YouMind-OpenLab/awesome-gpt-image-2/main";
const youMindNanoBananaProRawBase = "https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main";
const davidWuGptImage2RawBase = "https://raw.githubusercontent.com/davidwuw0811-boop/awesome-gpt-image2-prompts/main";
const gptImage2CaseFiles = ["README.md", "cases/ad-creative.md", "cases/character.md", "cases/comparison.md", "cases/ecommerce.md", "cases/portrait.md", "cases/poster.md", "cases/ui.md"];
const cacheTtlMs = 1000 * 60 * 60;

const categories: PromptCategory[] = [
    { category: "gpt-image-2-prompts", githubUrl: "https://github.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts", build: buildGptImage2Prompts },
    { category: "awesome-gpt-image", githubUrl: "https://github.com/ZeroLu/awesome-gpt-image", build: buildAwesomeGptImagePrompts },
    { category: "awesome-gpt4o-image-prompts", githubUrl: "https://github.com/ImgEdify/Awesome-GPT4o-Image-Prompts", build: buildAwesomeGpt4oImagePrompts },
    { category: "youmind-gpt-image-2", githubUrl: "https://github.com/YouMind-OpenLab/awesome-gpt-image-2", build: () => buildYouMindPrompts(youMindGptImage2RawBase, "youmind-gpt-image-2", "gpt-image-2") },
    { category: "youmind-nano-banana-pro", githubUrl: "https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts", build: () => buildYouMindPrompts(youMindNanoBananaProRawBase, "youmind-nano-banana-pro", "nano-banana-pro") },
    { category: "davidwu-gpt-image2-prompts", githubUrl: "https://github.com/davidwuw0811-boop/awesome-gpt-image2-prompts", build: buildDavidWuGptImage2Prompts },
    { category: "manga-script-master", githubUrl: "https://github.com/snailzsh/manga-script-master", build: buildMangaScriptMasterPrompts },
];

let memoryCache: { items: Prompt[]; fetchedAt: number } | null = null;
let loadingPrompts: Promise<Prompt[]> | null = null;

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const keyword = (params.get("keyword") || "").trim().toLowerCase();
    const tags = params.getAll("tag").filter(Boolean);
    const category = params.get("category") || "";
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.get("pageSize")) || 20));
    const items = await getPrompts(category);
    const withoutTagFilter = filterPrompts(items, { keyword, category, tags: [] });
    const filtered = filterPrompts(items, { keyword, category, tags });

    return Response.json({
        items: filtered.slice((page - 1) * pageSize, page * pageSize),
        tags: collectTags(withoutTagFilter),
        categories: categories.map((item) => item.category),
        total: filtered.length,
    });
}

async function getPrompts(category = "") {
    if (isActiveOption(category)) {
        const matchedCategory = categories.find((item) => item.category === category);
        if (matchedCategory) return loadPromptCategories([matchedCategory]);
    }
    if (memoryCache && Date.now() - memoryCache.fetchedAt < cacheTtlMs) return memoryCache.items;
    if (loadingPrompts) return loadingPrompts;
    loadingPrompts = loadPrompts().finally(() => {
        loadingPrompts = null;
    });
    return loadingPrompts;
}

async function loadPrompts() {
    const items = await loadPromptCategories(categories);
    memoryCache = { items, fetchedAt: Date.now() };
    return items;
}

async function loadPromptCategories(promptCategories: PromptCategory[]) {
    const settled = await Promise.all(
        promptCategories.map(async (category) => {
            try {
                const items = await category.build();
                return items.map((item) => ({ ...item, category: category.category, githubUrl: category.githubUrl }));
            } catch {
                return [];
            }
        }),
    );
    return settled.flat();
}

function filterPrompts(items: Prompt[], options: { keyword: string; category: string; tags: string[] }) {
    return items.filter((item) => {
        if (isActiveOption(options.category) && item.category !== options.category) return false;
        if (options.tags.length && !options.tags.some((tag) => item.tags.includes(tag))) return false;
        if (!options.keyword) return true;
        return [item.title, item.prompt, item.category, ...item.tags].join(" ").toLowerCase().includes(options.keyword);
    });
}

async function buildGptImage2Prompts() {
    const data = (await fetchJson<{ records?: Array<{ title?: string; tweet_url?: string; image_dir?: string; category?: string; added_at?: string }> }>(gptImage2RawBase, "data/ingested_tweets.json")).records || [];
    const cases = new Map<string, string>();
    const markdowns = await Promise.all(gptImage2CaseFiles.map((file) => fetchText(gptImage2RawBase, file)));
    markdowns.forEach((markdown) => collectGptImage2Cases(cases, markdown));
    const items: Omit<Prompt, "category" | "githubUrl">[] = [];
    data.forEach((item) => {
        const prompt = cases.get(item.tweet_url || "");
        if (!item.title || !prompt || !item.image_dir) return;
        const image = `${gptImage2RawBase}/${item.image_dir}/output.jpg`;
        items.push({ id: `gpt-image-2-prompts-${leftPad(items.length + 1)}`, title: item.title, coverUrl: image, prompt, tags: tagsFromCategory(item.category || ""), preview: markdownPreview([image]), createdAt: item.added_at || "", updatedAt: item.added_at || "" });
    });
    return items;
}

function collectGptImage2Cases(cases: Map<string, string>, markdown: string) {
    for (const match of markdown.matchAll(/### Case \d+: \[[^\]]+]\(([^)]+)\)[\s\S]*?\*\*Prompt:\*\*\s*\r?\n\s*```[\w-]*\r?\n([\s\S]*?)\r?\n```/g)) {
        cases.set(match[1], match[2].trim());
    }
}

async function buildAwesomeGptImagePrompts() {
    const markdown = await fetchText(awesomeGptImageRawBase, "README.zh-CN.md");
    const items: Omit<Prompt, "category" | "githubUrl">[] = [];
    for (const section of splitBeforeHeading(markdown, "## ")) {
        const tags = tagsFromHeading(firstMatch(section, /^##\s+(.+)$/m));
        for (const block of splitBeforeHeading(section, "### ")) {
            const title = firstMatch(block, /^###\s+(.+)$/m).replace(/\[([^\]]+)]\([^)]+\)/g, "$1").trim();
            const prompt = firstMatch(block, /\*\*提示词:\*\*\s*\r?\n\s*```[\w-]*\r?\n([\s\S]*?)\r?\n```/).trim();
            if (!title || !prompt) continue;
            const images = extractMarkdownImages(awesomeGptImageRawBase, block);
            items.push(defaultPrompt(`awesome-gpt-image-${leftPad(items.length + 1)}`, title, prompt, images[0] || "", tags, markdownPreview(images)));
        }
    }
    return items;
}

async function buildAwesomeGpt4oImagePrompts() {
    const markdown = await fetchText(awesomeGpt4oImagePromptsBase, "README.zh-CN.md");
    const items: Omit<Prompt, "category" | "githubUrl">[] = [];
    for (const block of splitBeforeHeading(markdown, "### ")) {
        const title = firstMatch(block, /^###\s+(.+)$/m).trim();
        const prompt = firstMatch(block, /- \*\*提示词文本：\*\*\s*`([\s\S]*?)`/).trim();
        if (!title || !prompt) continue;
        const images = extractMarkdownImages(awesomeGpt4oImagePromptsBase, block);
        items.push(defaultPrompt(`awesome-gpt4o-image-prompts-${leftPad(items.length + 1)}`, title, prompt, images[0] || "", ["gpt4o"], markdownPreview(images)));
    }
    return items;
}

async function buildYouMindPrompts(baseUrl: string, idPrefix: string, modelTag: string) {
    const markdown = await fetchText(baseUrl, "README_zh.md");
    const items: Omit<Prompt, "category" | "githubUrl">[] = [];
    for (const block of splitBeforeHeading(markdown, "### ")) {
        const title = firstMatch(block, /^###\s+No\.\s*\d+:\s*(.+)$/m).trim();
        const prompt = firstMatch(block, /#### [\s\S]*?提示词\s*\r?\n\s*```[\w-]*\r?\n([\s\S]*?)\r?\n```/).trim();
        if (!title || !prompt) continue;
        const images = extractMarkdownImages(baseUrl, block);
        items.push(defaultPrompt(`${idPrefix}-${leftPad(items.length + 1)}`, title, prompt, images[0] || "", youMindTags(title, modelTag), markdownPreview(images)));
    }
    return items;
}

async function buildDavidWuGptImage2Prompts() {
    const data = await fetchJson<Array<{ id?: number; title_en?: string; title_cn?: string; category?: string; category_cn?: string; prompt?: string; note?: string; author?: string; source?: string; needs_ref?: boolean; image?: string }>>(davidWuGptImage2RawBase, "prompts.json");
    return data
        .map((item, index) => {
            const title = (item.title_cn || item.title_en || "").trim();
            const prompt = (item.prompt || "").trim();
            if (!title || !prompt) return null;
            const image = absoluteImage(davidWuGptImage2RawBase, item.image || "");
            const preview = [item.title_en, item.note, image ? `![](${image})` : ""].filter(Boolean).join("\n\n");
            return defaultPrompt(`davidwu-gpt-image2-prompts-${leftPad(item.id || index + 1)}`, title, prompt, image, davidWuTags(item), preview);
        })
        .filter((item): item is Omit<Prompt, "category" | "githubUrl"> => Boolean(item));
}

function defaultPrompt(id: string, title: string, prompt: string, coverUrl: string, tags: string[], preview: string): Omit<Prompt, "category" | "githubUrl"> {
    return { id, title, coverUrl, prompt, tags, preview, createdAt: "", updatedAt: "" };
}

const MANGA_TEMPLATES: Omit<Prompt, "category" | "githubUrl">[] = [
    {
        id: "manga-short-video",
        title: "短剧转漫剧脚本",
        coverUrl: "",
        prompt: `## 短剧转漫剧任务

将以下短剧脚本转换为漫剧格式。
要求:
- 保留原剧情线和核心冲突
- 补全角色视觉锚点和AI标签
- 按节奏模型重新分配时间轴
- 每10秒一个小高潮
- 输出格式: 角色卡 + 单集脚本 + 分镜表

### 原始短剧脚本

[在此粘贴短剧脚本]`,
        tags: ["漫剧", "短剧转换", "脚本"],
        preview: "将已有的短剧脚本转换为漫剧格式，自动补全角色视觉锚点、AI标签组，按节奏模型重新分配时间轴。",
        createdAt: "",
        updatedAt: "",
    },
    {
        id: "manga-novel-to-storyboard",
        title: "小说片段转分镜表",
        coverUrl: "",
        prompt: `## 小说片段转分镜任务

将以下小说片段转化为AI分镜表。
要求:
- 所有情感描写必须具象化为可视动作
- 每个场景标注景别和光影
- 台词控制在15字以内
- 输出格式: 分镜表格（# | 时间 | 景别 | 画面描述 | 台词 | 转场 | AI提示词）
- 自动判断赛道类型并应用对应节奏模型

### 小说片段

[在此粘贴小说段落]`,
        tags: ["漫剧", "小说转分镜", "分镜表"],
        preview: "将小说段落转化为完整AI分镜表，含景别、光影、台词、转场效果和AI提示词。",
        createdAt: "",
        updatedAt: "",
    },
    {
        id: "manga-outline-to-episode",
        title: "剧情梗概 → 分集脚本",
        coverUrl: "",
        prompt: `## 剧情梗概转分集脚本

### 剧情梗概

[在此填写剧情梗概]

### 角色设定

角色1: [姓名]
  类型: [主角/配角/反派]
  视觉锚点: [发型、标志物等]
  AI标签: 1boy/girl, [hair], [eyes], [clothing]

角色2: [姓名]
  类型: [主角/配角/反派]
  视觉锚点: [发型、标志物等]
  AI标签: 1boy/girl, [hair], [eyes], [clothing]

### 要求
- 第1集包含: 黄金开局(前3秒) + 中段密度 + 结尾钩子
- 自动选择赛道节奏模型
- 每集500字以内
- 输出: 分集标题 + 场景脚本 + 分镜表 + 下集预告`,
        tags: ["漫剧", "分集脚本", "梗概"],
        preview: "根据剧情梗概和角色设定，自动生成完整的分集漫剧脚本，含分镜表。",
        createdAt: "",
        updatedAt: "",
    },
    {
        id: "manga-rhythm-power-fantasy",
        title: "爽文赛道节奏模型",
        coverUrl: "",
        prompt: `## 爽文赛道节奏模型

公式: 压抑 → 揭晓/觉醒 → 降维打击

阶段:
- 开局受辱(0-3秒): 主角被碾压，制造情绪压抑
- 持续受压(3-23秒): 压力累积，观众期待反转
- 身份揭晓(23-28秒): 第一个反转信号
- 碾压反击(28-60秒): 降维打击，释放爽感

核心爽感: 反差+碾压。压得越狠，爆发越爽

### 应用指南
将此模型应用于剧本创作时，确保:
1. 前3秒建立明确的"被压制"画面
2. 中间20秒持续积累压抑感
3. 在23-28秒之间安排第一个反转信号
4. 最终留足30秒让主角完成碾压`,
        tags: ["漫剧", "节奏模型", "爽文"],
        preview: "爽文赛道节奏模型：压抑→揭晓→降维打击，含阶段时间分配和创作指南。",
        createdAt: "",
        updatedAt: "",
    },
    {
        id: "manga-rhythm-sweet-romance",
        title: "甜宠赛道节奏模型",
        coverUrl: "",
        prompt: `## 甜宠赛道节奏模型

公式: 误会/试探 → 心动瞬间 → 确认心意

阶段:
- 日常破冰(0-3秒): 日常场景切入，快速代入
- 意外亲密(3-18秒): 肢体/眼神意外接触
- 心动暗示(18-38秒): 暧昧积累，微表情推拉
- 甜蜜高光(38-60秒): 关系确认或甜蜜高潮

核心爽感: 心跳加速的粉红泡泡感，靠微表情和暧昧距离

### 应用指南
1. 前3秒建立日常氛围，不宜过度设计
2. 意外亲密接触是整集第一个"心动"锚点，必须足够自然
3. 暧昧阶段用眼神/距离/触碰的微变化推进
4. 甜蜜高潮不宜在结尾，留20%给下集预告钩子`,
        tags: ["漫剧", "节奏模型", "甜宠"],
        preview: "甜宠赛道节奏模型：试探→心动→确认，含暧昧距离和微表情指南。",
        createdAt: "",
        updatedAt: "",
    },
    {
        id: "manga-rhythm-suspense",
        title: "悬疑赛道节奏模型",
        coverUrl: "",
        prompt: `## 悬疑赛道节奏模型

公式: 异常 → 追查 → 真相比想象更恐怖

阶段:
- 诡异画面(0-3秒): 反常现象直接开场
- 线索拼图(3-33秒): 主角发现线索，层层推进
- 第一层真相(33-43秒): 以为真相已现
- 终极反转(43-60秒): 揭露更大阴谋

核心爽感: 认知颠覆。让观众以为自己猜到了，然后打脸

### 应用指南
1. 开场画面必须反常，不需要解释
2. 线索推进要有明确的方向感，让观众可以"跟着推理"
3. 第一层真相要给足"原来如此"的满足感
4. 反转必须推翻第一层真相的基本假设`,
        tags: ["漫剧", "节奏模型", "悬疑"],
        preview: "悬疑赛道节奏模型：异常→追查→反转，含认知颠覆策略。",
        createdAt: "",
        updatedAt: "",
    },
    {
        id: "manga-rhythm-comedy",
        title: "搞笑赛道节奏模型",
        coverUrl: "",
        prompt: `## 搞笑赛道节奏模型

公式: 正经铺垫 → 荒诞转折 → 连环打脸

阶段:
- 正常场景(0-3秒): 建立正经氛围
- 第一个包袱(3-13秒): 引入荒诞元素
- 递进(13-28秒): 笑点升级，连环打脸
- 终极反转(28-40秒): 最大笑点收尾

核心爽感: 预期违背。越正经的铺垫，越离谱的转折

### 应用指南
1. 铺垫越正经越有效，角色必须对自己的处境"当真"
2. 第一个包袱要破坏但不摧毁铺垫建立的世界观
3. 递进阶段的每个笑点都比上一个更离谱
4. 40秒内完成，搞笑漫剧的核心是节奏快`,
        tags: ["漫剧", "节奏模型", "搞笑"],
        preview: "搞笑赛道节奏模型：正经铺垫→荒诞转折→连环打脸，含笑点节奏指南。",
        createdAt: "",
        updatedAt: "",
    },
];

async function buildMangaScriptMasterPrompts() {
    return MANGA_TEMPLATES;
}

async function fetchText(baseUrl: string, file: string) {
    const response = await fetch(`${baseUrl}/${file}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${file} 拉取失败`);
    return response.text();
}

async function fetchJson<T>(baseUrl: string, file: string) {
    return JSON.parse(await fetchText(baseUrl, file)) as T;
}

function splitBeforeHeading(markdown: string, prefix: string) {
    const blocks: string[] = [];
    let current: string[] = [];
    for (const line of markdown.split("\n")) {
        if (line.startsWith(prefix) && current.length) {
            blocks.push(current.join("\n"));
            current = [];
        }
        current.push(line);
    }
    blocks.push(current.join("\n"));
    return blocks;
}

function firstMatch(value: string, pattern: RegExp) {
    return pattern.exec(value)?.[1] || "";
}

function extractMarkdownImages(baseUrl: string, markdown: string) {
    return Array.from(markdown.matchAll(/!\[[^\]]*]\(([^)]+)\)/g), (match) => absoluteImage(baseUrl, match[1])).filter(Boolean);
}

function absoluteImage(baseUrl: string, image: string) {
    if (!image) return "";
    if (/^https?:\/\//i.test(image)) return image;
    return `${baseUrl}/${image.replace(/^\.?\//, "")}`;
}

function tagsFromCategory(category: string) {
    return splitTags(category.replace(/\s+Cases$/i, ""), /\s*(?:&|and)\s*/);
}

function tagsFromHeading(heading: string) {
    return splitTags(heading.replace(/[^\p{L}\p{N}/&、与 ]/gu, ""), /\s*(?:\/|&|、|与)\s*/);
}

function youMindTags(title: string, modelTag: string) {
    const [, prefix] = title.match(/^(.+?) - /) || [];
    return [modelTag, ...tagsFromHeading(prefix || "")];
}

function davidWuTags(item: { category_cn?: string; category?: string; author?: string; source?: string; needs_ref?: boolean }) {
    const tags = splitTags([item.category_cn, item.category, item.author, item.source].filter(Boolean).join("/"), /\//);
    if (item.needs_ref) tags.push("需要参考图");
    return tags;
}

function splitTags(value: string, pattern: RegExp) {
    return value
        .split(pattern)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
}

function markdownPreview(images: string[]) {
    return images.filter(Boolean).map((image) => `![](${image})`).join("\n\n");
}

function collectTags(items: Prompt[]) {
    return Array.from(new Set(items.flatMap((item) => item.tags).filter(Boolean)));
}

function leftPad(value: number) {
    return String(value).padStart(4, "0");
}

function isActiveOption(value: string) {
    return value && value !== "全部" && value !== "all";
}
