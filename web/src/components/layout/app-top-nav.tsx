"use client";

import { Bot, Menu, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Input, message as antdMessage } from "antd";
import { useState } from "react";

import { getVisibleNavigationTools, navigationTools, type NavigationToolSlug } from "@/constant/navigation-tools";
import { AppConfigModal } from "@/components/layout/app-config-modal";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { UserStatusActions } from "@/components/layout/user-status-actions";
import { publicPath } from "@/lib/app-paths";
import { cn } from "@/lib/utils";
import {
    createModelChannel,
    encodeChannelModel,
    filterModelsByCapability,
    modelOptionName,
    type AiConfig,
    type ApiCallFormat,
    type ModelChannel,
    useConfigStore,
} from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";

type ExperienceApiDraft = {
    baseUrl: string;
    apiKey: string;
    models: string[];
    apiFormat: ApiCallFormat;
    providerHint: string;
};

type ExperienceChatMessage = {
    role: "user" | "assistant";
    content: string;
    apiDraft?: ExperienceApiDraft;
    links?: ExperienceLink[];
};

type ExperienceLink = {
    label: string;
    href: string;
    description: string;
};

const API_HELP_LINKS: ExperienceLink[] = [
    {
        label: "火山方舟控制台",
        href: "https://console.volcengine.com/ark",
        description: "申请豆包、Seedance、Seedream 等火山模型 Key",
    },
    {
        label: "OpenAI 平台",
        href: "https://platform.openai.com/api-keys",
        description: "申请 OpenAI 官方 API Key",
    },
    {
        label: "Google AI Studio",
        href: "https://aistudio.google.com/app/apikey",
        description: "申请 Gemini API Key",
    },
];

export function AppTopNav() {
    const pathname = usePathname();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [experienceOpen, setExperienceOpen] = useState(false);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const user = useUserStore((state) => state.user);
    const hideHeader = /^\/canvas\/[^/]+/.test(pathname);
    const useDarkHome = false;
    const slug = pathname.split("/").filter(Boolean)[0];
    const activeToolSlug = navigationTools.some((tool) => tool.slug === slug) ? (slug as NavigationToolSlug) : undefined;
    const visibleTools = getVisibleNavigationTools(user?.role);

    return (
        <>
            {!hideHeader ? (
                <header className={cn("sceneflow-top-nav sticky top-0 z-20 h-16 shrink-0 border-b", useDarkHome ? "border-white/10 bg-[#090a0c]" : "border-[#beb2a3] bg-[#fffefa] shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_14px_34px_rgba(35,28,20,0.16)]")}>
                    <div className="mx-auto flex h-full max-w-7xl items-stretch justify-between gap-4 px-6">
                        <div className="flex min-w-0 items-center">
                            <Link href="/" className={cn("flex h-full shrink-0 items-center gap-2 text-sm font-semibold leading-none tracking-tight transition", useDarkHome ? "text-white hover:text-white/72" : "text-[#050816] hover:text-[#2432c9]")}>
                                <span
                                    className="size-5 shrink-0 bg-current"
                                    style={{
                                        mask: `url(${publicPath("/logo.svg")}) center / contain no-repeat`,
                                        WebkitMask: `url(${publicPath("/logo.svg")}) center / contain no-repeat`,
                                    }}
                                />
                                <span className="text-base font-medium">SceneFlow</span>
                            </Link>

                            <button
                                type="button"
                                className={cn("ml-3 inline-flex size-8 shrink-0 items-center justify-center transition md:hidden", useDarkHome ? "text-white/72 hover:text-white" : "text-[#746b7a] hover:text-[#172033]")}
                                onClick={() => setMobileNavOpen(true)}
                                aria-label="打开导航菜单"
                                title="导航菜单"
                            >
                                <Menu className="size-5" />
                            </button>

                            <nav className="hide-scrollbar ml-7 hidden h-16 min-w-0 items-center gap-4 overflow-x-auto md:flex">
                                {visibleTools.map((tool) => {
                                    const Icon = tool.icon;
                                    const active = tool.slug === activeToolSlug;
                                    return (
                                        <Link
                                            key={tool.slug}
                                            href={`/${tool.slug}`}
                                            className={cn(
                                                "relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm leading-6 transition",
                                                active
                                                    ? useDarkHome
                                                        ? "bg-white/12 font-medium text-white"
                                                        : "sceneflow-nav-active bg-[#e6e9ff] font-semibold text-[#1722b8] shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_8px_20px_rgba(79,93,255,0.16)]"
                                                    : useDarkHome
                                                      ? "text-white/54 hover:bg-white/8 hover:text-white/88"
                                                      : "font-semibold text-[#1f2937] hover:bg-[#f2ede4] hover:text-[#050816]",
                                            )}
                                        >
                                            <Icon className="size-4" />
                                            <span className="truncate">{tool.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className="my-auto ml-auto flex h-9 shrink-0 items-center justify-end gap-2 border-l border-[#e6dccd] pl-3 whitespace-nowrap">
                            <button
                                type="button"
                                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[#ded3c4] bg-[#fffefa] px-3 text-sm font-medium text-[#1f2937] shadow-[0_6px_14px_rgba(35,28,20,0.06)] transition hover:border-[#cfc5ff] hover:bg-[#f5f2ff] hover:text-[#4f5dff]"
                                onClick={() => setExperienceOpen(true)}
                            >
                                <Bot className="size-4" />
                                体验官
                            </button>
                            <UserStatusActions variant={useDarkHome ? "home" : "default"} showThemeToggle={false} />
                        </div>
                    </div>
                </header>
            ) : null}

            <MobileNavDrawer open={mobileNavOpen} activeToolSlug={activeToolSlug} onClose={() => setMobileNavOpen(false)} />
            <ExperienceOfficerModal
                open={experienceOpen}
                onClose={() => setExperienceOpen(false)}
                onOpenConfig={() => {
                    setExperienceOpen(false);
                    openConfigDialog(false);
                }}
            />
            <AppConfigModal />
        </>
    );
}

function ExperienceOfficerModal({ open, onClose, onOpenConfig }: { open: boolean; onClose: () => void; onOpenConfig: () => void }) {
    const config = useConfigStore((state) => state.config);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const [messages, setMessages] = useState<ExperienceChatMessage[]>([
        { role: "assistant", content: "你好，我是 SceneFlow 体验官。你可以问我 API 怎么接、Seedance 为什么报错、画布怎么开始、素材怎么复用。也可以直接把 Base URL、API Key、模型名粘给我，我可以帮你识别并填入配置。", links: API_HELP_LINKS },
    ]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const quickQuestions = ["Seedance 2.0 怎么配置？", "API Key 格式不正确怎么办？", "我有一段剧本怎么开始？", "帮我填 API 配置"];

    const sendQuestion = async (value = input) => {
        const text = value.trim();
        if (!text || sending) return;
        const nextMessages = [...messages, { role: "user" as const, content: text }];
        setMessages(nextMessages);
        setInput("");

        const apiDraft = parseApiDraft(text);
        if (apiDraft) {
            setMessages((current) => [...current, { role: "assistant", content: buildApiDraftReply(apiDraft), apiDraft }]);
            return;
        }

        const apiHelp = buildApiHelpReply(text);
        if (apiHelp) {
            setMessages((current) => [...current, apiHelp]);
            return;
        }

        setSending(true);
        try {
            const response = await fetch("/canvas/api/experience-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: nextMessages.map(({ role, content }) => ({ role, content })) }),
                credentials: "include",
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error || "体验官暂时无法回复");
            setMessages((current) => [...current, { role: "assistant", content: data?.answer || "我没有拿到有效回复，请换个问法再试。" }]);
        } catch (error) {
            setMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "体验官暂时无法回复" }]);
        } finally {
            setSending(false);
        }
    };

    const applyApiDraft = (draft: ExperienceApiDraft) => {
        const nextConfig = applyExperienceApiDraft(config, draft);
        (Object.keys(nextConfig) as Array<keyof AiConfig>).forEach((key) => updateConfig(key, nextConfig[key]));
        setMessages((current) => [
            ...current,
            {
                role: "assistant",
                content: "已填入 API 配置。我已经打开配置窗口，你确认模型分组是否正确后直接关闭即可。建议先用一个简单提示词测试生图或视频。",
            },
        ]);
        antdMessage.success("已填入 API 配置");
        openConfigDialog(false);
    };

    if (!open) return null;

    return (
        <div className="sceneflow-experience-dialog fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/38 p-4 backdrop-blur-[3px]" role="dialog" aria-modal="true" onMouseDown={onClose}>
            <div className="relative flex h-[560px] max-h-[76vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[18px] border border-[#ded3c4] bg-[#fffefa] p-5 text-[#172033] shadow-[0_28px_90px_rgba(23,32,51,0.22)]" onMouseDown={(event) => event.stopPropagation()}>
                <button type="button" className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-lg text-[#4b5567] transition hover:bg-[#f2ede4] hover:text-[#111827]" onClick={onClose} aria-label="关闭">
                    <X className="size-4" />
                </button>
                <div className="border-b border-[#ded3c4] pb-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f1ff] px-3 py-1 text-xs font-medium text-[#4f5dff]">
                        <Bot className="size-3.5" />
                        SceneFlow 体验官
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#172033]">直接问我问题</h2>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4">
                    {messages.map((message, index) => (
                        <div key={`${message.role}-${index}`} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[84%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6", message.role === "user" ? "bg-[#4f5dff] text-white" : "bg-[#fff7eb] text-[#263043]")}>
                                {message.content}
                                {message.apiDraft ? (
                                    <div className="mt-3 rounded-xl border border-[#eadfce] bg-white/75 p-3 text-xs leading-5 text-[#263043]">
                                        <div className="font-semibold">识别到的配置</div>
                                        <div className="mt-1 break-all">Base URL：{message.apiDraft.baseUrl}</div>
                                        <div className="break-all">API Key：{maskApiKey(message.apiDraft.apiKey)}</div>
                                        <div className="break-all">模型：{message.apiDraft.models.join("、")}</div>
                                        <Button className="mt-2" size="small" type="primary" onClick={() => applyApiDraft(message.apiDraft!)}>
                                            填入 API 配置
                                        </Button>
                                    </div>
                                ) : null}
                                {message.links?.length ? <ExperienceLinks links={message.links} /> : null}
                            </div>
                        </div>
                    ))}
                    {sending ? <div className="text-xs text-[#8a7f91]">体验官正在回复...</div> : null}
                </div>

                <div className="border-t border-[#ded3c4] pt-3">
                    <div className="mb-2 flex flex-wrap gap-2">
                        {quickQuestions.map((question) => (
                            <button key={question} type="button" className="rounded-full bg-[#f6f0e6] px-3 py-1.5 text-xs font-medium text-[#6d6472] transition hover:bg-[#ebe7ff] hover:text-[#4f5dff]" onClick={() => void sendQuestion(question)}>
                                {question}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input.TextArea
                            value={input}
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            placeholder="直接输入问题，或粘贴 Base URL / API Key / 模型名，我可以帮你填入配置"
                            onChange={(event) => setInput(event.target.value)}
                            onPressEnter={(event) => {
                                if (!event.shiftKey) {
                                    event.preventDefault();
                                    void sendQuestion();
                                }
                            }}
                        />
                        <Button type="primary" className="!h-auto" icon={<Send className="size-4" />} loading={sending} onClick={() => void sendQuestion()} />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                        <Button onClick={onOpenConfig}>配置 API</Button>
                        <Link href="/canvas" onClick={onClose}>
                            <Button type="primary">进入画布</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ExperienceLinks({ links }: { links: ExperienceLink[] }) {
    return (
        <div className="mt-3 grid gap-2">
            {links.map((link) => (
                <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-[#eadfce] bg-white/75 px-3 py-2 text-xs leading-5 text-[#263043] transition hover:border-[#c8c4ff] hover:bg-[#f7f5ff]"
                >
                    <span className="block font-semibold text-[#303bff]">{link.label}</span>
                    <span className="block text-[#6d6472]">{link.description}</span>
                </a>
            ))}
        </div>
    );
}

function buildApiHelpReply(text: string): ExperienceChatMessage | null {
    if (!/(哪里|哪|怎么|如何|申请|获取|开通|买|购买|key|api|密钥|中转|火山|seedance|seedream|openai|gemini)/i.test(text)) return null;
    if (!/(key|api|密钥|中转|火山|seedance|seedream|openai|gemini|模型)/i.test(text)) return null;
    return {
        role: "assistant",
        content:
            "你可以走两条路线：\n\n1. 官方直连：去模型厂商控制台申请 API Key，适合有技术基础、想自己管理账号和账单的用户。\n2. 第三方中转：去中转平台购买额度，复制它提供的 Base URL、API Key、模型名，适合新手和轻量用户。\n\n拿到后，把 Base URL / API Key / 模型名直接粘给我，我可以帮你填入 SceneFlow 配置。",
        links: API_HELP_LINKS,
    };
}

function parseApiDraft(text: string): ExperienceApiDraft | null {
    const baseUrl = extractBaseUrl(text);
    const apiKey = extractApiKey(text);
    const models = extractModelNames(text);
    if (!baseUrl || !apiKey || !models.length) return null;
    return {
        baseUrl,
        apiKey,
        models,
        apiFormat: /gemini|generativelanguage\.googleapis/i.test(baseUrl) ? "gemini" : "openai",
        providerHint: providerHint(baseUrl, models),
    };
}

function extractBaseUrl(text: string) {
    const match = text.match(/https?:\/\/[^\s，。；;'"<>）)]+/i);
    return match?.[0]?.replace(/\/+$/, "") || "";
}

function extractApiKey(text: string) {
    const bearer = text.match(/Bearer\s+([A-Za-z0-9._\-]{12,})/i)?.[1];
    if (bearer) return bearer.trim();
    const labeled = text.match(/(?:api\s*key|apikey|key|密钥|令牌|token)\s*[:：=]\s*([A-Za-z0-9._\-]{12,})/i)?.[1];
    if (labeled) return labeled.trim();
    return text.match(/\b(?:sk|apikey|ak)-[A-Za-z0-9._\-]{8,}\b/i)?.[0]?.trim() || "";
}

function extractModelNames(text: string) {
    const labeled = text.match(/(?:model|模型|模型名|模型列表)\s*[:：=]\s*([A-Za-z0-9._,\-:/\s]+)(?:\n|$)/i)?.[1] || "";
    const candidates = [
        ...labeled.split(/[,，\s]+/),
        ...Array.from(text.matchAll(/\b(?:doubao|seedance|seedream|gpt|claude|gemini|kling|wan|veo|sora|flux|midjourney)[A-Za-z0-9._\-:]*\b/gi)).map((item) => item[0]),
    ];
    return Array.from(new Set(candidates.map((item) => item.trim()).filter((item) => item.length >= 3 && !/^https?:/i.test(item) && !/^Bearer$/i.test(item)))).slice(0, 12);
}

function providerHint(baseUrl: string, models: string[]) {
    const value = `${baseUrl} ${models.join(" ")}`.toLowerCase();
    if (value.includes("volces") || value.includes("seedance") || value.includes("seedream") || value.includes("doubao")) return "火山方舟 / 豆包";
    if (value.includes("gemini") || value.includes("googleapis")) return "Gemini";
    if (value.includes("openai")) return "OpenAI";
    return "OpenAI 兼容接口 / 第三方中转";
}

function buildApiDraftReply(draft: ExperienceApiDraft) {
    const keyWarning = /volces|ark\.cn|seedance|doubao/i.test(`${draft.baseUrl} ${draft.models.join(" ")}`) && !/^sk-|^apikey-/i.test(draft.apiKey) ? "\n\n注意：如果你用的是火山官方直连，Key 通常不是 AK/SK，也不要带 Bearer；如果是第三方中转，以中转站给你的 Key 为准。" : "";
    return `我识别到了 API 配置，可以帮你自动填入。\n\n类型：${draft.providerHint}\n调用格式：${draft.apiFormat === "gemini" ? "Gemini" : "OpenAI 兼容"}\n模型数量：${draft.models.length}${keyWarning}`;
}

function maskApiKey(apiKey: string) {
    if (apiKey.length <= 10) return "********";
    return `${apiKey.slice(0, 6)}${"*".repeat(Math.min(12, apiKey.length - 10))}${apiKey.slice(-4)}`;
}

function applyExperienceApiDraft(config: AiConfig, draft: ExperienceApiDraft): AiConfig {
    const channelName = draft.providerHint === "OpenAI 兼容接口 / 第三方中转" ? "体验官配置渠道" : draft.providerHint;
    const existingIndex = config.channels.findIndex((channel) => channel.baseUrl.replace(/\/+$/, "") === draft.baseUrl);
    const channel: ModelChannel =
        existingIndex >= 0
            ? {
                  ...config.channels[existingIndex],
                  name: config.channels[existingIndex].name || channelName,
                  baseUrl: draft.baseUrl,
                  apiKey: draft.apiKey,
                  apiFormat: draft.apiFormat,
                  models: uniqueRawModels([...config.channels[existingIndex].models, ...draft.models]),
              }
            : createModelChannel({ name: channelName, baseUrl: draft.baseUrl, apiKey: draft.apiKey, apiFormat: draft.apiFormat, models: draft.models });
    const channels = existingIndex >= 0 ? config.channels.map((item, index) => (index === existingIndex ? channel : item)) : [...config.channels, channel];
    const models = channels.flatMap((item) => item.models.map((model) => encodeChannelModel(item.id, model)));
    const imageModels = filterModelsByCapability(models, "image");
    const videoModels = filterModelsByCapability(models, "video");
    const textModels = filterModelsByCapability(models, "text");
    const audioModels = filterModelsByCapability(models, "audio");
    const encodedDraftModels = channel.models.map((model) => encodeChannelModel(channel.id, model));

    return {
        ...config,
        channelMode: "local",
        baseUrl: channel.baseUrl,
        apiKey: channel.apiKey,
        apiFormat: channel.apiFormat,
        channels,
        models,
        imageModels,
        videoModels,
        textModels,
        audioModels,
        model: pickDefaultModel(config.model, encodedDraftModels, models),
        imageModel: pickDefaultModel(config.imageModel, imageModels, models),
        videoModel: pickDefaultModel(config.videoModel, videoModels, models),
        textModel: pickDefaultModel(config.textModel, textModels, models),
        audioModel: pickDefaultModel(config.audioModel, audioModels, models),
    };
}

function pickDefaultModel(current: string, preferred: string[], fallback: string[]) {
    if (current && fallback.some((model) => modelOptionName(model) === modelOptionName(current) || model === current)) return current;
    return preferred[0] || fallback[0] || current;
}

function uniqueRawModels(models: string[]) {
    return Array.from(new Set(models.map((model) => model.trim()).filter(Boolean)));
}
