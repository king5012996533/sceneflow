"use client";

import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Button, Modal } from "antd";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";

export type InsufficientCreditsModalInfo = {
    balance?: number;
    required?: number;
    message?: string;
};

export type InsufficientCreditsModalHandle = {
    open: (info?: InsufficientCreditsModalInfo) => void;
};

/** 从服务端 403 消息（"积分不足：本次生成需要 X 积分，当前余额 Y 积分…"）中解析余额/所需 */
function parseServerMessage(message: string): Pick<InsufficientCreditsModalInfo, "balance" | "required"> {
    const requiredMatch = /需要\s*(\d+)\s*积分/.exec(message);
    const balanceMatch = /余额\s*(\d+)\s*积分/.exec(message);
    return {
        required: requiredMatch ? Number(requiredMatch[1]) : undefined,
        balance: balanceMatch ? Number(balanceMatch[1]) : undefined,
    };
}

/** 积分余额不足弹窗（替代旧的"今日生成次数已用完" quota 弹窗） */
export const InsufficientCreditsModal = forwardRef<InsufficientCreditsModalHandle>((_props, ref) => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [info, setInfo] = useState<InsufficientCreditsModalInfo>({});

    const handleOpen = useCallback((next?: InsufficientCreditsModalInfo) => {
        const parsed = next?.message ? parseServerMessage(next.message) : {};
        setInfo({ ...parsed, ...next });
        setOpen(true);
    }, []);

    useImperativeHandle(ref, () => ({ open: handleOpen }), [handleOpen]);

    const body =
        info.message ??
        `本次生成需要 ${info.required ?? "—"} 积分，当前余额 ${info.balance ?? "—"} 积分。可前往定价页充值，或等待每日赠送积分。`;

    return (
        <Modal open={open} onCancel={() => setOpen(false)} footer={null} centered width={420} styles={{ body: { padding: "32px", textAlign: "center" } }}>
            <div className="mb-5 flex justify-center">
                <div className="grid size-16 place-items-center rounded-full bg-amber-50">
                    <Wallet className="size-8 text-amber-500" />
                </div>
            </div>

            <h3 className="mb-2 text-base font-semibold">积分余额不足</h3>
            <p className="mb-6 text-sm leading-6 text-stone-500">{body}</p>

            <div className="flex gap-3">
                <Button block onClick={() => setOpen(false)}>
                    稍后再说
                </Button>
                <Button
                    block
                    type="primary"
                    onClick={() => {
                        setOpen(false);
                        router.push("/pricing");
                    }}
                >
                    去充值
                </Button>
            </div>
        </Modal>
    );
});

InsufficientCreditsModal.displayName = "InsufficientCreditsModal";
