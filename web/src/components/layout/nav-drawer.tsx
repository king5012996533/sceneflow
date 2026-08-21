"use client";

import { Drawer } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, LogOut, Moon, Sun, UserRound, X } from "lucide-react";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { getVisibleNavigationTools, navigationTools, type NavigationTool, type NavigationToolSlug } from "@/constant/navigation-tools";
import { DOCS_URL } from "@/constant/env";
import { publicPath } from "@/lib/app-paths";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/use-theme-store";
import { useUserStore } from "@/stores/use-user-store";

type NavDrawerProps = {
    open: boolean;
    activeToolSlug?: NavigationToolSlug;
    onClose: () => void;
};

/** 抽屉内导航分组：与设计稿一致（创作 / 素材 / 账户） */
const NAV_GROUPS: { eyebrow: string; slugs: NavigationToolSlug[] }[] = [
    { eyebrow: "创作 · Create", slugs: ["canvas", "studio", "cut"] },
    { eyebrow: "素材 · Assets", slugs: ["prompts", "assets"] },
    { eyebrow: "账户 · Account", slugs: ["pricing", "admin"] },
];

export function NavDrawer({ open, activeToolSlug, onClose }: NavDrawerProps) {
    const router = useRouter();
    const user = useUserStore((state) => state.user);
    const clearSession = useUserStore((state) => state.clearSession);
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const visibleTools = getVisibleNavigationTools(user?.role);

    const toolsBySlug = Object.fromEntries(navigationTools.map((tool) => [tool.slug, tool])) as Record<NavigationToolSlug, NavigationTool>;

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="left"
            width={304}
            closable={false}
            maskClosable
            keyboard
            styles={{
                content: { background: "#ffffff", borderTop: "5px solid #2a3330", overflow: "hidden" },
                header: { display: "none" },
                body: { padding: 0, display: "flex", flexDirection: "column", height: "100%" },
                mask: { background: "rgba(42,51,48,0.30)" },
            }}
        >
            {/* 头部：品牌 + 关闭 */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#dde2dc] pl-5 pr-3.5">
                <Link href="/" onClick={onClose} className="flex items-center gap-2.5" aria-label="SceneFlow 首页">
                    <span
                        className="size-5 shrink-0 bg-[#2a3330]"
                        style={{
                            mask: `url(${publicPath("/logo.svg")}) center / contain no-repeat`,
                            WebkitMask: `url(${publicPath("/logo.svg")}) center / contain no-repeat`,
                        }}
                    />
                    <span className="sf-serif text-[16px] font-semibold leading-none text-[#2a3330]">SceneFlow</span>
                </Link>
                <button type="button" onClick={onClose} aria-label="关闭导航" title="关闭导航" className="flex size-8 shrink-0 items-center justify-center rounded-[9px] text-[#67726b] transition hover:bg-[#e7ece8] hover:text-[#2a3330]">
                    <X className="size-4" />
                </button>
            </div>

            {/* 导航分组 */}
            <nav className="flex-1 space-y-5 overflow-y-auto px-3.5 py-[18px]">
                {NAV_GROUPS.map((group) => {
                    const items = group.slugs.map((slug) => toolsBySlug[slug]).filter((tool) => visibleTools.includes(tool));
                    if (items.length === 0) return null;
                    return (
                        <div key={group.eyebrow}>
                            <p className="sf-mono mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#67726b]">{group.eyebrow}</p>
                            <div className="space-y-0.5">
                                {items.map((tool) => {
                                    const Icon = tool.icon;
                                    const active = tool.slug === activeToolSlug;
                                    return (
                                        <Link
                                            key={tool.slug}
                                            href={tool.path ?? `/${tool.slug}`}
                                            onClick={onClose}
                                            className={cn(
                                                "relative flex h-11 items-center gap-3 rounded-[10px] px-2.5 text-[14px] font-medium text-[#67726b] transition hover:bg-[#f7f9f5] hover:text-[#2a3330]",
                                                active && "bg-[#e7ece8] font-semibold text-[#2a3330] before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-[3px] before:bg-[#a0713f]",
                                            )}
                                        >
                                            <span className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-[9px] border border-[#dde2dc] bg-[#ffffff] text-[#67726b]", active && "border-transparent text-[#a0713f]")}>
                                                <Icon className="size-[15px]" />
                                            </span>
                                            <span>{tool.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* 底部：用户区 / 登录注册 + 文档/主题 */}
            <div className="shrink-0 border-t border-[#dde2dc] px-3.5 pb-3.5 pt-3">
                {user ? (
                    <div className="flex items-center gap-2.5 px-1.5 pb-2.5 pt-1">
                        <span className="sf-serif flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#a0713f] text-[15px] font-semibold text-[#ffffff]">{(user.name || user.email || "U").slice(0, 1).toUpperCase()}</span>
                        <div className="min-w-0 flex-1">
                            <strong className="block truncate text-[13px] font-semibold text-[#2a3330]">{user.name || user.email}</strong>
                            <small className="block truncate text-[11px] text-[#67726b]">{user.email}</small>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                void clearSession().finally(() => router.push("/login"));
                            }}
                            title="退出登录"
                            aria-label="退出登录"
                            className="flex size-8 shrink-0 items-center justify-center rounded-[9px] text-[#67726b] transition hover:bg-[#f6e8e5] hover:text-[#a3342c]"
                        >
                            <LogOut className="size-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-1.5 pb-2.5 pt-1">
                        <Link href="/login" onClick={onClose} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-[#dde2dc] bg-[#ffffff] text-xs font-semibold text-[#2a3330] transition hover:bg-[#f2f5f0]">
                            <UserRound className="size-3.5" />
                            登录
                        </Link>
                        <Link href="/register" onClick={onClose} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-[#a0713f] text-xs font-semibold text-[#ffffff] transition hover:bg-[#8a4f2b]">
                            注册
                        </Link>
                    </div>
                )}
                <div className="flex items-center border-t border-dashed border-[#dde2dc] pt-2">
                    <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="flex h-8 items-center gap-1.5 rounded-[9px] px-2 text-xs font-medium text-[#67726b] transition hover:bg-[#e7ece8] hover:text-[#2a3330]">
                        <BookOpen className="size-3.5" />
                        文档
                    </a>
                    <AnimatedThemeToggler
                        theme={theme === "dark" ? "dark" : "light"}
                        onThemeChange={setTheme}
                        className="flex h-8 items-center gap-1.5 rounded-[9px] px-2 text-xs font-medium text-[#67726b] transition hover:bg-[#e7ece8] hover:text-[#2a3330]"
                    >
                        {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                        <span>主题</span>
                    </AnimatedThemeToggler>
                    <span className="flex-1" />
                    <span className="sf-mono text-[11px] tracking-[0.08em] text-[#9aa49e]">SF v0.9</span>
                </div>
            </div>
        </Drawer>
    );
}
