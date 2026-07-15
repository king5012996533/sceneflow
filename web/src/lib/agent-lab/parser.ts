import type { AgentLabArtifact } from "./types";

const JSON_BLOCK_PATTERN = /```json\s*([\s\S]*?)```/i;

export function splitAgentLabArtifact(raw: string) {
    const match = raw.match(JSON_BLOCK_PATTERN);
    if (!match) return { answer: raw.trim() };

    const answer = raw.replace(match[0], "").trim();
    const artifact = parseArtifact(match[1]);
    return { answer: answer || raw.trim(), artifact };
}

function parseArtifact(input: string): AgentLabArtifact | undefined {
    try {
        const data = JSON.parse(input) as Partial<AgentLabArtifact>;
        if (!data || typeof data !== "object") return undefined;
        return {
            intent: typeof data.intent === "string" ? data.intent : "chat",
            title: typeof data.title === "string" ? data.title : "Agent 产物",
            summary: typeof data.summary === "string" ? data.summary : "",
            plan: parsePlan(data.plan),
            toolActions: parseToolActions(data.toolActions),
            selfCheck: parseSelfCheck(data.selfCheck),
            nextSteps: Array.isArray(data.nextSteps) ? data.nextSteps.filter((item): item is string => typeof item === "string") : [],
            deliverables: Array.isArray(data.deliverables)
                ? data.deliverables
                      .filter((item) => item && typeof item === "object")
                      .map((item) => {
                          const record = item as Record<string, unknown>;
                          return {
                              type: typeof record.type === "string" ? record.type : "advice",
                              title: typeof record.title === "string" ? record.title : "交付物",
                              content: typeof record.content === "string" ? record.content : "",
                          };
                      })
                : [],
        };
    } catch {
        return undefined;
    }
}

function parsePlan(input: unknown): AgentLabArtifact["plan"] {
    if (!input || typeof input !== "object") return undefined;
    const data = input as Record<string, unknown>;
    return {
        cards: toStringList(data.cards),
        missingAssets: toStringList(data.missingAssets),
        nextQuestion: typeof data.nextQuestion === "string" ? data.nextQuestion : "",
        executableNow: toStringList(data.executableNow),
    };
}

function parseToolActions(input: unknown): AgentLabArtifact["toolActions"] {
    if (!Array.isArray(input)) return undefined;
    const supportedTypes = new Set(["create_portrait_card", "create_turnaround_card", "create_storyboard_card", "create_scene_card", "create_keyframe_card", "create_video_card", "save_asset", "ask_user"]);
    const actions = input
        .filter((item) => item && typeof item === "object")
        .map((item, index) => {
            const data = item as Record<string, unknown>;
            const type = typeof data.type === "string" && supportedTypes.has(data.type) ? (data.type as NonNullable<AgentLabArtifact["toolActions"]>[number]["type"]) : "ask_user";
            return {
                id: typeof data.id === "string" && data.id.trim() ? data.id : `${type}-${index + 1}`,
                type,
                title: typeof data.title === "string" && data.title.trim() ? data.title : "待确认动作",
                description: typeof data.description === "string" ? data.description : "",
                requires: toStringList(data.requires),
                payload: data.payload && typeof data.payload === "object" && !Array.isArray(data.payload) ? (data.payload as Record<string, unknown>) : undefined,
            };
        });
    return actions.length ? actions : undefined;
}

function parseSelfCheck(input: unknown): AgentLabArtifact["selfCheck"] {
    if (!input || typeof input !== "object") return undefined;
    const data = input as Record<string, unknown>;
    const rawScore = typeof data.score === "number" ? data.score : Number(data.score);
    return {
        score: Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 60,
        passed: toStringList(data.passed),
        risks: toStringList(data.risks),
        fixes: toStringList(data.fixes),
    };
}

function toStringList(input: unknown) {
    return Array.isArray(input) ? input.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}
