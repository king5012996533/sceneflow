"use client";

import { Button, Modal } from "antd";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

type Props = {
    open: boolean;
    onClose: () => void;
    remaining: number;
    limit: number | null;
};

export function QuotaExceededModal({ open, onClose, remaining, limit }: Props) {
    const router = useRouter();

    return (
        <Modal
            open={open}
            onCancel={onClose}
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
                <Button block onClick={onClose}>
                    稍后再说
                </Button>
                <Button block type="primary" onClick={() => router.push("/canvas/pricing")}>
                    查看套餐
                </Button>
            </div>
        </Modal>
    );
}
