export type AgentLabRole = "user" | "assistant";

export type AgentLabMessage = {
    role: AgentLabRole;
    content: string;
};

export type AgentLabProvider = {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
};

export type AgentLabPersona = {
    id: string;
    name: string;
    description: string;
    prompt: string;
};

export type AgentLabMemory = {
    projectBrief?: string;
    stylePreference?: string;
    characterMemory?: string;
    constraints?: string;
};

export type AgentLabRequest = {
    messages?: AgentLabMessage[];
    provider?: AgentLabProvider;
    persona?: AgentLabPersona;
    memory?: AgentLabMemory;
};

export type AgentLabArtifact = {
    intent: string;
    title: string;
    summary: string;
    plan?: {
        cards: string[];
        missingAssets: string[];
        nextQuestion: string;
        executableNow: string[];
    };
    toolActions?: Array<{
        id: string;
        type: "create_portrait_card" | "create_turnaround_card" | "create_storyboard_card" | "create_scene_card" | "create_keyframe_card" | "create_video_card" | "save_asset" | "ask_user";
        title: string;
        description: string;
        requires: string[];
        payload?: Record<string, unknown>;
    }>;
    selfCheck?: {
        score: number;
        passed: string[];
        risks: string[];
        fixes: string[];
    };
    nextSteps: string[];
    deliverables: Array<{
        type: string;
        title: string;
        content: string;
    }>;
};

export type AgentLabResponse = {
    answer: string;
    artifact?: AgentLabArtifact;
    model?: string;
};
