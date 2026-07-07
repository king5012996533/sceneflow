"use client";

import { Bot, Menu, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Input } from "antd";

import { getVisibleNavigationTools, navigationTools, type NavigationToolSlug } from "@/constant/navigation-tools";
import { AppConfigModal } from "@/components/layout/app-config-modal";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { UserStatusActions } from "@/components/layout/user-status-actions";
import { publicPath } from "@/lib/app-paths";
import { cn } from "@/lib/utils";
import { useConfigStore } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";
import { useState } from "react";

export function AppTopNav() {
    const pathname = usePathname();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [experienceOpen, setExperienceOpen] = useState(false);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const user = useUserStore((state) => state.user);
    const hideHeader = /^\/canvas\/[^/]+/.test(pathname);
    const isHome = pathname === "/";
    const useDarkHome = false;
    const slug = pathname.split("/").filter(Boolean)[0];
    const activeToolSlug = navigationTools.some((tool) => tool.slug === slug) ? (slug as NavigationToolSlug) : undefined;
    const visibleTools = getVisibleNavigationTools(user?.role);

    return (
        <>
            {!hideHeader ? (
                <header className={cn("sceneflow-top-nav sticky top-0 z-20 h-16 shrink-0 border-b", useDarkHome ? "border-white/10 bg-[#090a0c]" : "border-[#beb2a3] bg-[#fffefa] shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_14px_34px_rgba(35,28,20,0.16)]")}>
                    <div className="mx-auto flex h-full max-w-7xl items-stretch justify-between gap-5 px-6">
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

                            <nav className="hide-scrollbar ml-8 hidden h-16 min-w-0 items-center gap-7 overflow-x-auto md:flex">
                                {visibleTools.map((tool) => {
                                    const Icon = tool.icon;
                                    const active = tool.slug === activeToolSlug;
                                    return (
                                        <Link
                                            key={tool.slug}
                                            href={`/${tool.slug}`}
                                            className={cn(
                                                "relative flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm leading-6 transition",
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

                        <div className="my-auto flex h-9 min-w-0 items-center justify-end gap-2 justify-self-end whitespace-nowrap">
                            {isHome ? (
                                <button
                                    type="button"
                                    className="hidden h-9 items-center gap-2 rounded-xl border border-[#eadfce] bg-white/70 px-3 text-sm font-medium text-[#4b5567] shadow-sm transition hover:border-[#cfc5ff] hover:bg-[#f5f2ff] hover:text-[#4f5dff] md:inline-flex"
                                    onClick={() => setExperienceOpen(true)}
                                >
                                    <Bot className="size-4" />
                                    体验官
                                </button>
                            ) : null}
                            <UserStatusActions variant={useDarkHome ? "home" : "default"} showThemeToggle={false} />
                        </div>
                    </div>
                </header>
            ) : null}

            <MobileNavDrawer open={mobileNavOpen} activeToolSlug={activeToolSlug} onClose={() => setMobileNavOpen(false)} />
            <ExperienceOfficerModal open={experienceOpen} onClose={() => setExperienceOpen(false)} onOpenConfig={() => { setExperienceOpen(false); openConfigDialog(false); }} />
            <AppConfigModal />
        </>
    );
}

function ExperienceOfficerModal({ open, onClose, onOpenConfig }: { open: boolean; onClose: () => void; onOpenConfig: () => void }) {
    const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
        { role: "assistant", content: "你好，我是 SceneFlow 体验官。你可以直接问我 API 怎么接、Seedance 为什么报错、画布怎么开始、素材怎么复用。" },
    ]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const quickQuestions = ["Seedance 2.0 怎么配置？", "API Key 格式不正确怎么办？", "我有一段剧本怎么开始？", "角色三视图有什么用？"];

    const sendQuestion = async (value = input) => {
        const text = value.trim();
        if (!text || sending) return;
        const nextMessages = [...messages, { role: "user" as const, content: text }];
        setMessages(nextMessages);
        setInput("");
        setSending(true);
        try {
            const response = await fetch("/canvas/api/experience-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: nextMessages }),
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

    if (!open) return null;

    return (
        <div className="sceneflow-experience-dialog fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/38 p-4 backdrop-blur-[3px]" role="dialog" aria-modal="true" onMouseDown={onClose}>
            <div className="relative flex h-[560px] max-h-[76vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[18px] border border-[#ded3c4] bg-[#fffefa] p-5 text-[#172033] shadow-[0_28px_90px_rgba(23,32,51,0.22)]" onMouseDown={(event) => event.stopPropagation()}>
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
                            <div className={cn("max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6", message.role === "user" ? "bg-[#4f5dff] text-white" : "bg-[#fff7eb] text-[#263043]")}>
                                {message.content}
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
                            placeholder="直接输入你的问题，例如：Seedance 报 API key format incorrect 怎么办？"
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
