"use client";

import { Bot, Menu, Send } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Input, Modal } from "antd";

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
    const slug = pathname.split("/").filter(Boolean)[0];
    const activeToolSlug = navigationTools.some((tool) => tool.slug === slug) ? (slug as NavigationToolSlug) : undefined;
    const visibleTools = getVisibleNavigationTools(user?.role);

    return (
        <>
            {!hideHeader ? (
                <header className={cn("sticky top-0 z-20 h-16 shrink-0 border-b backdrop-blur-xl", isHome ? "border-white/10 bg-[#090a0c]/92" : "border-border bg-background/90")}>
                    <div className="mx-auto flex h-full max-w-7xl items-stretch justify-between gap-5 px-6">
                        <div className="flex min-w-0 items-center">
                            <Link href="/" className={cn("flex h-full shrink-0 items-center gap-2 text-sm font-semibold leading-none tracking-tight transition", isHome ? "text-white hover:text-white/72" : "text-stone-950 hover:text-stone-600 dark:text-stone-100 dark:hover:text-stone-300")}>
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
                                className={cn("ml-3 inline-flex size-8 shrink-0 items-center justify-center transition md:hidden", isHome ? "text-white/72 hover:text-white" : "text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white")}
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
                                                "relative flex h-16 shrink-0 items-center gap-2 text-sm leading-6 transition after:absolute after:inset-x-0 after:bottom-0 after:h-px",
                                                active
                                                    ? isHome
                                                        ? "font-medium text-white after:bg-white"
                                                        : "font-medium text-stone-950 after:bg-stone-950 dark:text-stone-100 dark:after:bg-stone-100"
                                                    : isHome
                                                      ? "text-white/46 after:bg-transparent hover:text-white/86"
                                                      : "text-stone-500 after:bg-transparent hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100",
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
                                    className="hidden h-9 items-center gap-2 rounded-lg border border-white/12 bg-white/[0.055] px-3 text-sm font-medium text-white/78 transition hover:border-white/22 hover:bg-white/[0.09] hover:text-white md:inline-flex"
                                    onClick={() => setExperienceOpen(true)}
                                >
                                    <Bot className="size-4" />
                                    体验官
                                </button>
                            ) : null}
                            <UserStatusActions variant={isHome ? "home" : "default"} />
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

    return (
        <Modal open={open} onCancel={onClose} footer={null} centered width={720} title={null} destroyOnHidden>
            <div className="flex h-[620px] max-h-[76vh] flex-col py-1">
                <div className="border-b border-stone-200 pb-4 dark:border-stone-800">
                    <div className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 dark:bg-stone-900 dark:text-stone-300">
                        <Bot className="size-3.5" />
                        SceneFlow 体验官
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-stone-950 dark:text-stone-100">直接问我问题</h2>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4">
                    {messages.map((message, index) => (
                        <div key={`${message.role}-${index}`} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6", message.role === "user" ? "bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950" : "bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-200")}>
                                {message.content}
                            </div>
                        </div>
                    ))}
                    {sending ? <div className="text-xs text-stone-400">体验官正在回复...</div> : null}
                </div>

                <div className="border-t border-stone-200 pt-3 dark:border-stone-800">
                    <div className="mb-2 flex flex-wrap gap-2">
                        {quickQuestions.map((question) => (
                            <button key={question} type="button" className="rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-600 transition hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800" onClick={() => void sendQuestion(question)}>
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
        </Modal>
    );
}
