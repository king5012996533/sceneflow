"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { CreditBalanceBadge } from "@/components/credits/credit-balance-badge";
import { NavDrawer } from "@/components/layout/nav-drawer";
import { navigationTools } from "@/constant/navigation-tools";
import { publicPath } from "@/lib/app-paths";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/use-user-store";

/** 非工具页面的标题兜底（工具页标题直接取自 navigationTools.label） */
const EXTRA_PAGE_TITLES: Record<string, string> = {
    "/billing": "积分账单",
};

export function AppTopNav() {
    const pathname = usePathname();
    const [navOpen, setNavOpen] = useState(false);
    const fetchSession = useUserStore((state) => state.fetchSession);
    // 项目页隐藏顶栏；画布库页固定位于 /canvas/canvas（/canvas 是旧版落地页别名），需保留顶栏
    const hideHeader = /^\/canvas\/[^/]+/.test(pathname) && pathname !== "/canvas/canvas";

    useEffect(() => {
        void fetchSession();
    }, [fetchSession]);

    if (hideHeader) return null;

    const slug = pathname.split("/").filter(Boolean)[0];
    const activeTool = navigationTools.find((tool) => tool.slug === slug);
    const pageTitle = activeTool ? activeTool.label : EXTRA_PAGE_TITLES[pathname];

    return (
        <>
            <header className="sticky top-0 z-20 h-14 shrink-0 border-t-[5px] border-t-[#201914] border-b border-b-[#ded2c3] bg-[#fffdf8] shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_10px_24px_rgba(35,28,20,0.06)] sm:h-16">
                <div className="mx-auto flex h-full w-full max-w-[1440px] items-center gap-3 px-3.5 sm:gap-[18px] sm:px-5 2xl:px-8">
                    <Link href="/" aria-label="SceneFlow 首页" className="flex h-full shrink-0 items-center gap-2 sm:gap-2.5">
                        <span
                            className="size-5 shrink-0 bg-[#201914] sm:size-[22px]"
                            style={{
                                mask: `url(${publicPath("/logo.svg")}) center / contain no-repeat`,
                                WebkitMask: `url(${publicPath("/logo.svg")}) center / contain no-repeat`,
                            }}
                        />
                        <span className="sf-serif text-[16px] font-semibold leading-none tracking-[0.01em] text-[#201914] sm:text-[18px]">SceneFlow</span>
                    </Link>

                    {pageTitle ? (
                        <>
                            <span aria-hidden="true" className="h-[18px] w-px shrink-0 bg-[#ded2c3] sm:h-[22px]" />
                            <span className="sf-serif min-w-0 truncate text-[15px] tracking-[0.02em] text-[#7a6d63] sm:text-[16px]">{pageTitle}</span>
                        </>
                    ) : null}

                    <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
                        <CreditBalanceBadge variant="warm" />
                        <button
                            type="button"
                            aria-label={navOpen ? "关闭导航菜单" : "打开导航菜单"}
                            title="导航菜单"
                            onClick={() => setNavOpen(true)}
                            className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-[#ded2c3] bg-[#fffdf8] transition hover:border-[#9b5b32] hover:bg-[#f1e3cf] sm:size-9")}
                        >
                            <span className={cn("absolute left-1/2 h-[2px] w-4 -ml-2 rounded-[2px] bg-[#201914] transition-all duration-200", navOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-[calc(50%-4px)]")} />
                            <span className={cn("absolute left-1/2 h-[2px] w-4 -ml-2 rounded-[2px] bg-[#201914] transition-all duration-200", navOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-[calc(50%+2px)]")} />
                        </button>
                    </div>
                </div>
            </header>

            <NavDrawer open={navOpen} activeToolSlug={activeTool?.slug} onClose={() => setNavOpen(false)} />
        </>
    );
}
