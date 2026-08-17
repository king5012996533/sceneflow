"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { getVisibleNavigationTools, navigationTools, type NavigationToolSlug } from "@/constant/navigation-tools";
import { AppConfigModal } from "@/components/layout/app-config-modal";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { UserStatusActions } from "@/components/layout/user-status-actions";
import { CreditBalanceBadge } from "@/components/credits/credit-balance-badge";
import { publicPath } from "@/lib/app-paths";
import { cn } from "@/lib/utils";
import { useConfigStore } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";

export function AppTopNav() {
    const pathname = usePathname();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const user = useUserStore((state) => state.user);
    const hideHeader = /^\/canvas\/[^/]+/.test(pathname);
    const useDarkHome = false;
    const slug = pathname.split("/").filter(Boolean)[0];
    const activeToolSlug = navigationTools.some((tool) => tool.slug === slug) ? (slug as NavigationToolSlug) : undefined;
    const visibleTools = getVisibleNavigationTools(user?.role);

    return (
        <>
            {!hideHeader ? (
                <header className={cn("sceneflow-top-nav sticky top-0 z-20 h-16 shrink-0 border-b", useDarkHome ? "border-white/10 bg-[#090a0c]" : "border-[#e6e8ec] bg-[#ffffff] shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_14px_34px_rgba(35,28,20,0.16)]")}>
                    <div className="flex h-full w-full items-stretch gap-3 px-4 2xl:px-8">
                        <div className="flex min-w-0 flex-1 items-center">
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
                                className={cn("ml-3 inline-flex size-8 shrink-0 items-center justify-center transition md:hidden", useDarkHome ? "text-white/72 hover:text-white" : "text-[#746b7a] hover:text-[#101828]")}
                                onClick={() => setMobileNavOpen(true)}
                                aria-label="打开导航菜单"
                                title="导航菜单"
                            >
                                <Menu className="size-5" />
                            </button>

                            <nav className="hide-scrollbar ml-6 hidden h-16 min-w-0 flex-1 items-center gap-2 overflow-x-auto pr-2 md:flex">
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
                                                      : "font-semibold text-[#1f2937] hover:bg-[#f2f4f7] hover:text-[#050816]",
                                            )}
                                        >
                                            <Icon className="size-4" />
                                            <span>{tool.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className="my-auto ml-auto flex h-9 min-w-0 shrink-0 items-center justify-end gap-1.5 border-l border-[#e6e8ec] pl-3 whitespace-nowrap">
                            <CreditBalanceBadge />
                            <UserStatusActions variant={useDarkHome ? "home" : "default"} showThemeToggle={false} />
                        </div>
                    </div>
                </header>
            ) : null}

            <MobileNavDrawer open={mobileNavOpen} activeToolSlug={activeToolSlug} onClose={() => setMobileNavOpen(false)} />
            <AppConfigModal />
        </>
    );
}
