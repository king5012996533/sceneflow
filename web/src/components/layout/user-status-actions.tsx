"use client";

import type { CSSProperties } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Keyboard, Settings2, LogOut, Shield, User } from "lucide-react";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { GitHubLink } from "@/components/layout/github-link";
import { VersionReleaseModal } from "@/components/layout/version-release-modal";
import { DOCS_URL } from "@/constant/env";
import { publicPath } from "@/lib/app-paths";
import { cn } from "@/lib/utils";
import { canvasThemes } from "@/lib/canvas-theme";
import { useConfigStore } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { useUserStore } from "@/stores/use-user-store";

type UserStatusActionsProps = {
    showConfig?: boolean;
    showThemeToggle?: boolean;
    variant?: "default" | "canvas" | "home";
    onOpenShortcuts?: () => void;
};

export function UserStatusActions({ showConfig = true, showThemeToggle = true, variant = "default", onOpenShortcuts }: UserStatusActionsProps) {
    const router = useRouter();
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const { user, clearSession, fetchSession } = useUserStore();
    const canvasTheme = canvasThemes[theme];
    const naturalIconClass = "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#ded3c4] bg-[#fffefa] text-[#1f2937] shadow-[0_6px_14px_rgba(35,28,20,0.06)] transition hover:border-[#c6bbac] hover:bg-[#f2ede4] hover:text-[#050816] dark:border-white/10 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-white [&_svg]:size-4";
    const iconStyle: CSSProperties | undefined = variant === "canvas" ? { color: canvasTheme.node.text } : variant === "home" ? { color: "rgba(255,255,255,.82)" } : undefined;
    const versionStyle = iconStyle;
    const gitHubClassName = "size-7 text-base";
    const gitHubStyle = iconStyle;

    useEffect(() => { fetchSession(); }, []);

    return (
        <div className="inline-flex shrink-0 items-center gap-1.5">
            {user ? (
                <>
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 text-xs", variant === "home" ? "text-white/72" : "text-[#1f2937]")}>
                        <User className="size-3.5" />
                        {user.name || user.email}
                    </span>
                    {user.role === "admin" ? (
                        <a href={publicPath("/admin")} className={naturalIconClass} style={iconStyle} aria-label="管理后台" title="管理后台">
                            <Shield className="size-4" />
                        </a>
                    ) : null}
                    <button type="button" className={naturalIconClass} style={iconStyle} onClick={() => { clearSession(); router.push("/canvas/login"); }} title="退出登录">
                        <LogOut className="size-4" />
                    </button>
                </>
            ) : (
                <>
                    <a href="/canvas/login" className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-all", variant === "home" ? "border-transparent text-white/68 hover:bg-white/8 hover:text-white" : "border-[#ded3c4] bg-[#fffefa] text-[#1f2937] shadow-[0_6px_14px_rgba(35,28,20,0.06)] hover:bg-[#f2ede4] hover:text-[#050816]")}>
                        <User className="size-3.5" />
                        登录
                    </a>
                    <a href="/canvas/register" className={cn("sceneflow-register-action inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all", variant === "home" ? "border border-white/14 bg-white/8 text-white hover:bg-white/12" : "bg-[#4f5dff] text-white shadow-[0_10px_24px_rgba(79,93,255,0.18)] hover:bg-[#3846e8] dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200")}>
                        注册
                    </a>
                </>
            )}
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className={naturalIconClass} style={iconStyle} aria-label="文档" title="文档">
                <BookOpen className="size-4" />
            </a>
            {showConfig ? (
                <button type="button" className={naturalIconClass} style={iconStyle} onClick={() => openConfigDialog(false)} aria-label="配置" title="配置">
                    <Settings2 className="size-4" />
                </button>
            ) : null}
            <AnimatedThemeToggler theme={theme} onThemeChange={setTheme} className={naturalIconClass} style={iconStyle} aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"} title={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"} />
            <VersionReleaseModal style={versionStyle} />
            <GitHubLink className={cn("bg-transparent hover:bg-transparent dark:hover:bg-transparent", gitHubClassName)} style={gitHubStyle} />
            {onOpenShortcuts ? (
                <button type="button" className={naturalIconClass} style={iconStyle} onClick={onOpenShortcuts} aria-label="快捷键" title="快捷键">
                    <Keyboard className="size-4" />
                </button>
            ) : null}
        </div>
    );
}
