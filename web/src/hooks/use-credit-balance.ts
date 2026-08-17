"use client";

import { useCallback, useEffect, useState } from "react";
import { apiPath } from "@/lib/app-paths";

export type CreditBalanceState = {
    /** 当前积分余额；null = 未知（未登录 / 加载中 / 接口不可用） */
    balance: number | null;
    loading: boolean;
    refresh: () => Promise<number | null>;
};

/**
 * 积分余额 Hook（Phase 4 前端闭环的唯一余额来源）。
 * 余额以服务端 /api/billing/credits 为准，生成扣费/充值后调用 refresh() 刷新。
 */
export function useCreditBalance(): CreditBalanceState {
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(apiPath("/api/billing/credits?take=1"), { credentials: "include", cache: "no-store" });
            if (!res.ok) return null;
            const data = await res.json();
            const next = typeof data?.balance === "number" ? data.balance : null;
            setBalance(next);
            return next;
        } catch {
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { balance, loading, refresh };
}
