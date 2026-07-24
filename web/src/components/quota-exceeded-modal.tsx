"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Button, Modal } from "antd";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export type QuotaExceededModalHandle = {
    open: (remaining: number, limit: number | null) => void;
};

export const QuotaExceededModal = forwardRef<QuotaExceededModalHandle>((_props, ref) => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [remaining, setRemaining] = useState(0);
    const [limit, setLimit] = useState<number | null>(null);

    const handleOpen = useCallback((r: number, l: number | null) => {
        setRemaining(r);
        setLimit(l);
        setOpen(true);
    }, []);

    useImperativeHandle(ref, () => ({ open: handleOpen }), [handleOpen]);

    return (
        <Modal
            open={open}
            onCancel={() => setOpen(false)}
            footer={null}
            centered
            width={420}
            styles={{ body: { padding: "32px", textAlign: "center" } }}
        >
            <div className="mb-5 flex justify-center">
                <div className="grid size-16 place-items-center rounded-full bg-amber-50">
                    <Lock className="size-8 text-amber-500" />
                </div>
            </div>

            <h3 className="mb-2 text-xl font-semibold">今日生成次数已用完</h3>
            <p className="mb-6 text-sm text-stone-500">
                免费版每日限 {limit ?? "-"} 次生成，当前已用完。升级套餐解锁无限生成。
            </p>

            <div className="flex gap-3">
                <Button block onClick={() => setOpen(false)}>
                    稍后再说
                </Button>
                <Button block type="primary" onClick={() => router.push("/canvas/pricing")}>
                    查看套餐
                </Button>
            </div>
        </Modal>
    );
});

QuotaExceededModal.displayName = "QuotaExceededModal";
