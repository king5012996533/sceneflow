"use client";

import { ArrowRight, Bot, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Modal } from "antd";

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
    const paths = [
        ["我还没有 API", "先了解需要准备什么：供应商账号、API Key、Base URL 和可用模型名称。", "config"],
        ["我想开始创作", "进入画布，粘贴剧本、片段或上传参考图，让 Agent 帮你搭流程。", "/canvas"],
        ["我想复用素材", "进入素材库，调用已有角色、三视图、场景、风格和视频资产。", "/assets"],
    ];
    const apiSteps = ["申请供应商账号", "创建 API Key", "复制 Base URL", "填写模型名称", "保存后测试生成"];
    const productionSteps = ["打开画布", "告诉 Agent 目标", "确认角色/素材来源", "逐步生成资产", "满意结果存入素材库"];

    return (
        <Modal open={open} onCancel={onClose} footer={null} centered width={820} title={null} destroyOnHidden>
            <div className="space-y-6 py-1">
                <div className="border-b border-stone-200 pb-5 dark:border-stone-800">
                    <div className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 dark:bg-stone-900 dark:text-stone-300">
                        <Bot className="size-3.5" />
                        SceneFlow 体验官
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-100">第一次使用，从 API 接入开始</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500 dark:text-stone-400">
                        SceneFlow 不只是漫剧创作工具，更是一个视觉生产工作台。你可以接入自己的图片、视频、文本、音频模型；如果还没有 API，体验官会先告诉你要准备什么。
                    </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    {paths.map(([title, desc, href]) => (
                        <button
                            key={title}
                            type="button"
                            onClick={() => {
                                if (href === "config") {
                                    onOpenConfig();
                                } else {
                                    onClose();
                                    window.location.href = href;
                                }
                            }}
                            className="group rounded-lg border border-stone-200 p-4 text-left transition hover:border-stone-400 hover:bg-stone-50 dark:border-stone-800 dark:hover:border-stone-600 dark:hover:bg-stone-900"
                        >
                            <div className="text-sm font-semibold text-stone-950 dark:text-stone-100">{title}</div>
                            <p className="mt-2 min-h-12 text-xs leading-5 text-stone-500 dark:text-stone-400">{desc}</p>
                            <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-stone-900 dark:text-stone-100">
                                开始
                                <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                            </div>
                        </button>
                    ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                        <div className="text-sm font-semibold text-stone-950 dark:text-stone-100">API 接入需要准备</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {apiSteps.map((step, index) => (
                                <span key={step} className="rounded-md bg-stone-100 px-2.5 py-1.5 text-xs text-stone-600 dark:bg-stone-900 dark:text-stone-300">
                                    {index + 1}. {step}
                                </span>
                            ))}
                        </div>
                        <div className="mt-4 rounded-lg bg-stone-100 p-3 text-xs leading-5 text-stone-600 dark:bg-stone-900 dark:text-stone-300">
                            支持 OpenAI 兼容接口和 Gemini 格式。常见要填：Base URL、API Key、文本模型、图片模型、视频模型、音频模型。
                        </div>
                    </div>

                    <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                        <div className="text-sm font-semibold text-stone-950 dark:text-stone-100">5 分钟跑通一个视觉任务</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {productionSteps.map((step, index) => (
                                <span key={step} className="rounded-md bg-stone-100 px-2.5 py-1.5 text-xs text-stone-600 dark:bg-stone-900 dark:text-stone-300">
                                    {index + 1}. {step}
                                </span>
                            ))}
                        </div>
                        <div className="mt-4 rounded-lg bg-stone-100 p-3 text-xs leading-5 text-stone-600 dark:bg-stone-900 dark:text-stone-300">
                            推荐对 Agent 说：帮我把这个视觉需求拆成生产流程，重点做素材来源、风格校准、关键帧、视频和资产入库。
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button onClick={onOpenConfig}>配置 API</Button>
                    <Link href="/canvas" onClick={onClose}>
                        <Button type="primary">进入画布</Button>
                    </Link>
                </div>
            </div>
        </Modal>
    );
}
