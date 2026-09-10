/**
 * 工程记忆（记忆层）。
 *
 * 一个画布工程在长期生产里会沉淀出跨会话、跨阶段的事实：角色锚点、场景设定、
 * 风格锁、连续性约束、既往决策。这些事实不属于某一次对话，也不该每轮都靠模型
 * 从画布快照里重新猜——它们是工程的资产，必须落盘、跨会话可复用。
 *
 * 存储位置：CanvasProject.memory（随工程一起本地落盘 + 走 /api/sync 同步到服务端），
 * 因此不需要新建表、不需要新接口，工程走到哪记忆跟到哪。
 *
 * 本模块只放类型与纯函数，方便被引擎、执行器、提示词构建共用，且不依赖任何 UI。
 */

export type MemoryAssetKind = "character" | "scene" | "style" | "prop" | "keyframe" | "video" | "other";

export type MemoryAsset = {
    kind: MemoryAssetKind;
    /** 资产名（角色名 / 场景名 / 风格名），同一 kind 下同名视为同一资产 */
    name: string;
    /** 画布上的节点 id；节点可能被用户删除，引用前应重新核对 */
    nodeIds: string[];
    /** 不可变锚点：角色脸型发型服装、场景空间布局、风格关键词等 */
    anchor?: string;
    notes?: string;
    updatedAt: string;
};

export type MemoryStyle = {
    positive?: string;
    negative?: string;
    notes?: string;
};

export type CanvasProjectMemory = {
    version: 1;
    /** 工程一句话设定 */
    brief?: string;
    style?: MemoryStyle;
    assets: MemoryAsset[];
    /** 连续性约束（按时间追加） */
    continuity: string[];
    /** 关键决策（按时间追加） */
    decisions: string[];
    updatedAt: string;
};

/** 模型写入记忆时的增量补丁：只给需要更新的字段 */
export type MemoryPatch = {
    brief?: string;
    style?: MemoryStyle;
    assets?: Array<{ kind?: string; name?: string; nodeIds?: string[]; anchor?: string; notes?: string }>;
    continuity?: string[];
    decisions?: string[];
};

const MAX_ASSETS = 60;
const MAX_CONTINUITY = 40;
const MAX_DECISIONS = 40;
const MAX_FIELD_CHARS = 600;
const MAX_ANCHOR_CHARS = 400;

/** 提示词里展示的条目上限：记忆要帮模型，不能挤掉上下文 */
const PROMPT_ASSET_LIMIT = 14;
const PROMPT_LIST_LIMIT = 8;

const ASSET_KINDS: MemoryAssetKind[] = ["character", "scene", "style", "prop", "keyframe", "video", "other"];

export function createEmptyMemory(): CanvasProjectMemory {
    return { version: 1, assets: [], continuity: [], decisions: [], updatedAt: new Date().toISOString() };
}

function text(value: unknown, limit = MAX_FIELD_CHARS): string {
    if (typeof value === "string") return value.trim().slice(0, limit);
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
}

function stringList(value: unknown, limit: number): string[] {
    if (!Array.isArray(value)) return [];
    const items = value.map((item) => text(item, MAX_FIELD_CHARS)).filter(Boolean);
    // 列表按时间追加，尾部才是新事实：超出上限时保留最新的，不能从头部截断把新信息丢掉
    return items.slice(-limit);
}

function assetKind(value: unknown): MemoryAssetKind {
    const kind = text(value, 24) as MemoryAssetKind;
    return ASSET_KINDS.includes(kind) ? kind : "other";
}

/**
 * 把任意来源（IndexedDB 旧数据、同步回来的 JSON、模型乱写的对象）规整成合法记忆。
 * 宁可丢掉脏字段，也不能让一个坏形状顺着提示词污染整条链路。
 */
export function normalizeMemory(value: unknown): CanvasProjectMemory {
    if (!value || typeof value !== "object" || Array.isArray(value)) return createEmptyMemory();
    const raw = value as Record<string, unknown>;
    const styleRaw = (raw.style && typeof raw.style === "object" && !Array.isArray(raw.style) ? raw.style : {}) as Record<string, unknown>;
    const style: MemoryStyle = {
        positive: text(styleRaw.positive) || undefined,
        negative: text(styleRaw.negative) || undefined,
        notes: text(styleRaw.notes) || undefined,
    };
    const assets = (Array.isArray(raw.assets) ? raw.assets : [])
        .map((item): MemoryAsset | null => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return null;
            const record = item as Record<string, unknown>;
            const name = text(record.name, 120);
            if (!name) return null;
            return {
                kind: assetKind(record.kind),
                name,
                nodeIds: stringList(record.nodeIds, 20),
                anchor: text(record.anchor, MAX_ANCHOR_CHARS) || undefined,
                notes: text(record.notes) || undefined,
                updatedAt: text(record.updatedAt, 40) || new Date().toISOString(),
            };
        })
        .filter((item): item is MemoryAsset => Boolean(item))
        .slice(0, MAX_ASSETS);

    return {
        version: 1,
        brief: text(raw.brief) || undefined,
        style: style.positive || style.negative || style.notes ? style : undefined,
        assets,
        continuity: stringList(raw.continuity, MAX_CONTINUITY),
        decisions: stringList(raw.decisions, MAX_DECISIONS),
        updatedAt: text(raw.updatedAt, 40) || new Date().toISOString(),
    };
}

function appendUnique(existing: string[], incoming: string[], cap: number): string[] {
    const seen = new Set(existing);
    const merged = [...existing];
    for (const item of incoming) {
        if (seen.has(item)) continue;
        seen.add(item);
        merged.push(item);
    }
    // 只保留最近的 cap 条
    return merged.slice(Math.max(0, merged.length - cap));
}

/**
 * 增量合并：资产按 kind+name 去重（同名视为同一资产的更新），列表按追加去重。
 * 模型每次只写它新知道的部分，历史事实不会被覆盖掉。
 */
export function mergeMemory(current: CanvasProjectMemory, patch: MemoryPatch): CanvasProjectMemory {
    const base = normalizeMemory(current);
    const now = new Date().toISOString();

    const incoming = (Array.isArray(patch.assets) ? patch.assets : [])
        .map((item): Omit<MemoryAsset, "updatedAt"> | null => {
            if (!item || typeof item !== "object") return null;
            const name = text(item.name, 120);
            if (!name) return null;
            return {
                kind: assetKind(item.kind),
                name,
                nodeIds: stringList(item.nodeIds, 20),
                anchor: text(item.anchor, MAX_ANCHOR_CHARS) || undefined,
                notes: text(item.notes) || undefined,
            };
        })
        .filter((item): item is Omit<MemoryAsset, "updatedAt"> => Boolean(item));

    const assets = [...base.assets];
    for (const item of incoming) {
        const index = assets.findIndex((asset) => asset.kind === item.kind && asset.name.toLowerCase() === item.name.toLowerCase());
        if (index === -1) {
            assets.push({ ...item, updatedAt: now });
            continue;
        }
        const previous = assets[index];
        assets[index] = {
            ...previous,
            // 新信息优先，缺省字段保留旧值（模型漏写锚点不等于锚点消失了）
            nodeIds: item.nodeIds.length ? Array.from(new Set([...previous.nodeIds, ...item.nodeIds])).slice(0, 20) : previous.nodeIds,
            anchor: item.anchor || previous.anchor,
            notes: item.notes || previous.notes,
            updatedAt: now,
        };
    }

    const style = patch.style
        ? {
              positive: text(patch.style.positive) || base.style?.positive,
              negative: text(patch.style.negative) || base.style?.negative,
              notes: text(patch.style.notes) || base.style?.notes,
          }
        : base.style;

    return {
        version: 1,
        brief: patch.brief !== undefined ? text(patch.brief) || base.brief : base.brief,
        style: style && (style.positive || style.negative || style.notes) ? style : undefined,
        assets: assets.slice(-MAX_ASSETS),
        continuity: appendUnique(base.continuity, stringList(patch.continuity, MAX_CONTINUITY), MAX_CONTINUITY),
        decisions: appendUnique(base.decisions, stringList(patch.decisions, MAX_DECISIONS), MAX_DECISIONS),
        updatedAt: now,
    };
}

/** 记忆是否为空（用于决定要不要注入提示词） */
export function isEmptyMemory(memory: CanvasProjectMemory): boolean {
    const normalized = normalizeMemory(memory);
    return !normalized.brief && !normalized.style && !normalized.assets.length && !normalized.continuity.length && !normalized.decisions.length;
}

/**
 * 渲染成提示词文本。默认给「摘要」版（够模型用，不抢上下文）；
 * 传 full=true 时给出完整条目，供 memory_read 工具按需取用。
 */
export function describeMemoryForPrompt(memory: CanvasProjectMemory, full = false): string {
    const normalized = normalizeMemory(memory);
    if (isEmptyMemory(normalized)) return "";

    const assetLimit = full ? normalized.assets.length : PROMPT_ASSET_LIMIT;
    const listLimit = full ? Math.max(normalized.continuity.length, normalized.decisions.length) : PROMPT_LIST_LIMIT;

    const assetLines = normalized.assets.slice(-assetLimit).map((asset) => {
        const nodes = asset.nodeIds.length ? ` 节点=${asset.nodeIds.join(",")}` : "";
        const anchor = asset.anchor ? ` 锚点="${asset.anchor}"` : "";
        const notes = asset.notes ? ` 备注="${asset.notes}"` : "";
        return `- [${asset.kind}] ${asset.name}${anchor}${nodes}${notes}`;
    });
    const continuityLines = normalized.continuity.slice(-listLimit).map((item) => `- ${item}`);
    const decisionLines = normalized.decisions.slice(-listLimit).map((item) => `- ${item}`);

    return [
        "【工程记忆】以下是本工程已确认的长期事实，跨会话有效；与当前画布冲突时以画布实际状态为准。",
        normalized.brief ? `设定：${normalized.brief}` : "",
        normalized.style ? `风格锁：正向="${normalized.style.positive || ""}" 负向="${normalized.style.negative || ""}"${normalized.style.notes ? ` 备注="${normalized.style.notes}"` : ""}` : "",
        assetLines.length ? `已建立资产：\n${assetLines.join("\n")}` : "",
        continuityLines.length ? `连续性约束：\n${continuityLines.join("\n")}` : "",
        decisionLines.length ? `既往决策：\n${decisionLines.join("\n")}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}

/** 记忆的简短统计，用于工具回执与界面展示 */
export function summarizeMemory(memory: CanvasProjectMemory): string {
    const normalized = normalizeMemory(memory);
    if (isEmptyMemory(normalized)) return "工程记忆为空。";
    return `工程记忆：资产 ${normalized.assets.length} 项，连续性 ${normalized.continuity.length} 条，决策 ${normalized.decisions.length} 条${normalized.brief ? "，已设定工程简述" : ""}${normalized.style ? "，已锁定风格" : ""}。`;
}
