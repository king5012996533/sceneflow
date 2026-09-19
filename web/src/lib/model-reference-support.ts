/**
 * 哪些模型不接受参考图（纯逻辑模块，可被 node 单测直接加载）。
 *
 * 判定依据是上游模型自己的入参 schema，不是猜的。2026-09-19 实测（借平台代理拉 Replicate 模型定义）：
 *   recraft-ai/recraft-v4-pro / recraft-v4 / recraft-v3 / recraft-20b
 *   入参只有 prompt / aspect_ratio / size（v3 多一个 style），**一个图像字段都没有**；
 *   对照 openai/gpt-image-2.5-flare 有 input_images（数组）。
 *
 * 为什么必须在前端拦：上游对不认识的输入字段是**忽略**而不是报错。把参考图发给 recraft，
 * 它会照常建任务、照常出图、照常计费，只是参考图完全没被用上 —— 用户以为在做参考图生图，
 * 拿到的却是一张与参考图无关的图，还付了钱。这种错永远不会以报错形式暴露出来。
 * （2026-09-19 线上实测：任务带 1 张参考图，29 秒 succeeded，成图与参考图无关。）
 *
 * 名单只在这里维护一处：能力默认值（model-capability-spec.ts）与用户端判定
 * （platform-catalog-store.ts）都读这里；后台标定（ProviderCredential.capabilities）优先于名字兜底，
 * 所以上游哪天真的开放了图像入参，后台勾一下即可覆盖这个名单。
 */

/** 命中即认为该模型不接受图像输入（大小写无关；`渠道::模型` 的前缀会被剥掉） */
const REFERENCE_UNSUPPORTED_KEYWORDS: readonly string[] = ["recraft"];

/** 剥掉 `渠道::模型` 前缀（Replicate 这类 owner/name 的名字本身含斜杠，不受影响） */
export function stripModelChannelPrefix(model: string): string {
    const value = String(model || "");
    const at = value.indexOf("::");
    return (at >= 0 ? value.slice(at + 2) : value).trim();
}

/** 该模型是否接受参考图（缺省 = 接受，与线上现状一致；只有明确登记过的才返回 false） */
export function modelNameSupportsReferences(model: string): boolean {
    const value = stripModelChannelPrefix(model).toLowerCase();
    if (!value) return true;
    return !REFERENCE_UNSUPPORTED_KEYWORDS.some((keyword) => value.includes(keyword));
}

/** 参考图入口被关掉时给用户看的说明（后台编辑器与用户端共用同一份文案） */
export const REFERENCE_UNSUPPORTED_HINT = "该模型不支持参考图：它只认文字描述，参考图不会被用上。请换一个支持参考图的模型。";
