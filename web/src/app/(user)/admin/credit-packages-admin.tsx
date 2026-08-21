"use client";

import { useEffect, useState } from "react";
import { App, Button, Input, InputNumber, Switch } from "antd";
import { PackagePlus, Tag } from "lucide-react";

import { apiPath } from "@/lib/app-paths";

type AdminPackage = {
    id: string;
    name: string;
    credits: number;
    priceCents: number;
    bonusCredits: number;
    sortOrder: number;
    isActive: boolean;
};

/** 编辑行（价格以元为单位显示/录入，保存时换算成分） */
type PackageRow = {
    id: string;
    name: string;
    credits: number;
    priceYuan: number;
    bonusCredits: number;
    sortOrder: number;
    isActive: boolean;
};

const EMPTY_ROW: Omit<PackageRow, "id"> = { name: "", credits: 100, priceYuan: 10, bonusCredits: 0, sortOrder: 99, isActive: true };

function toRow(p: AdminPackage): PackageRow {
    return { id: p.id, name: p.name, credits: p.credits, priceYuan: p.priceCents / 100, bonusCredits: p.bonusCredits, sortOrder: p.sortOrder, isActive: p.isActive };
}

/** 积分套餐定价编辑（/pricing 与 /billing 页实时读取 isActive 套餐；历史订单保留下单金额快照） */
export default function CreditPackagesAdmin() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<PackageRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState<PackageRow | null>(null);
    const [savingId, setSavingId] = useState<string | "draft" | null>(null);

    useEffect(() => {
        setLoading(true);
        void fetch(apiPath("/api/admin/credit-packages"), { cache: "no-store" })
            .then((res) => res.json())
            .then((json) => {
                if (json.error) throw new Error(json.error);
                setRows(((json.packages || []) as AdminPackage[]).map(toRow));
            })
            .catch((error) => message.error(error instanceof Error ? error.message : "加载积分套餐失败"))
            .finally(() => setLoading(false));
    }, [message]);

    function patchRow(id: string, patch: Partial<PackageRow>) {
        setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    }

    async function save(row: PackageRow) {
        setSavingId(row.id);
        try {
            const res = await fetch(apiPath("/api/admin/credit-packages"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: row.id,
                    name: row.name,
                    credits: row.credits,
                    priceCents: Math.round(row.priceYuan * 100),
                    bonusCredits: row.bonusCredits,
                    sortOrder: row.sortOrder,
                    isActive: row.isActive,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "保存失败");
            const saved: AdminPackage = json.package;
            setRows((prev) => prev.map((r) => (r.id === row.id ? toRow(saved) : r)));
            message.success(`已保存「${saved.name}」`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSavingId(null);
        }
    }

    async function create() {
        if (!draft) return;
        if (!draft.name.trim()) {
            message.warning("请填写套餐名称");
            return;
        }
        setSavingId("draft");
        try {
            const res = await fetch(apiPath("/api/admin/credit-packages"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: draft.name,
                    credits: draft.credits,
                    priceCents: Math.round(draft.priceYuan * 100),
                    bonusCredits: draft.bonusCredits,
                    sortOrder: draft.sortOrder,
                    isActive: draft.isActive,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "创建失败");
            const created: AdminPackage = json.package;
            setRows((prev) => [...prev, toRow(created)].sort((a, b) => a.sortOrder - b.sortOrder));
            setDraft(null);
            message.success(`已创建「${created.name}」`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "创建失败");
        } finally {
            setSavingId(null);
        }
    }

    function renderRow(row: PackageRow, key: string, mode: "edit" | "draft") {
        const saving = savingId === key;
        return (
            <div
                key={key}
                className={`grid grid-cols-2 items-center gap-3 rounded-lg border px-3 py-2.5 md:grid-cols-[1fr_88px_96px_80px_72px_56px_auto] ${row.isActive ? "border-[#dde2dc] bg-[#f7f9f5]" : "border-dashed border-[#dde2dc] bg-[#f4f6f2] opacity-75"}`}
            >
                <div className="min-w-0">
                    <Input value={row.name} maxLength={50} placeholder="套餐名称" onChange={(e) => (mode === "draft" ? setDraft({ ...(draft as PackageRow), name: e.target.value }) : patchRow(row.id, { name: e.target.value }))} />
                </div>
                <div>
                    <div className="mb-0.5 text-[10px] text-[#67726b]">积分</div>
                    <InputNumber className="w-full" min={1} max={10000000} value={row.credits} onChange={(v) => (mode === "draft" ? setDraft({ ...(draft as PackageRow), credits: v ?? 0 }) : patchRow(row.id, { credits: v ?? 0 }))} />
                </div>
                <div>
                    <div className="mb-0.5 text-[10px] text-[#67726b]">价格（元）</div>
                    <InputNumber className="w-full" min={0.01} max={10000000} precision={2} value={row.priceYuan} onChange={(v) => (mode === "draft" ? setDraft({ ...(draft as PackageRow), priceYuan: v ?? 0 }) : patchRow(row.id, { priceYuan: v ?? 0 }))} />
                </div>
                <div>
                    <div className="mb-0.5 text-[10px] text-[#67726b]">赠送</div>
                    <InputNumber className="w-full" min={0} max={10000000} value={row.bonusCredits} onChange={(v) => (mode === "draft" ? setDraft({ ...(draft as PackageRow), bonusCredits: v ?? 0 }) : patchRow(row.id, { bonusCredits: v ?? 0 }))} />
                </div>
                <div>
                    <div className="mb-0.5 text-[10px] text-[#67726b]">排序</div>
                    <InputNumber className="w-full" min={0} max={10000} value={row.sortOrder} onChange={(v) => (mode === "draft" ? setDraft({ ...(draft as PackageRow), sortOrder: v ?? 0 }) : patchRow(row.id, { sortOrder: v ?? 0 }))} />
                </div>
                <div>
                    <div className="mb-0.5 text-[10px] text-[#67726b]">启用</div>
                    <Switch size="small" checked={row.isActive} onChange={(checked) => (mode === "draft" ? setDraft({ ...(draft as PackageRow), isActive: checked }) : patchRow(row.id, { isActive: checked }))} />
                </div>
                <div className="col-span-2 flex justify-end gap-2 md:col-span-1">
                    <Button size="small" type="primary" loading={saving} disabled={mode === "draft" && !row.name.trim()} onClick={() => (mode === "draft" ? void create() : void save(row))}>
                        {mode === "draft" ? "创建" : "保存"}
                    </Button>
                    {mode === "draft" ? (
                        <Button size="small" onClick={() => setDraft(null)}>
                            取消
                        </Button>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <section className="rounded-2xl border border-[#dde2dc] bg-[#ffffff] p-5 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                <div className="sf-serif flex items-center gap-2 text-[17px] font-semibold">
                    <Tag className="size-4 text-[#a0713f]" />
                    积分套餐定价
                </div>
                <Button size="small" icon={<PackagePlus className="size-3.5" />} onClick={() => setDraft({ ...EMPTY_ROW, id: "draft" } as PackageRow)}>
                    新增套餐
                </Button>
            </div>
            <p className="mb-4 text-xs leading-5 text-[#67726b]">定价页 / 购买页实时读取启用中的套餐（停用即从页面下架）；改价不影响已生成的订单（金额为下单时快照）。</p>
            {loading ? (
                <div className="py-6 text-center text-sm text-[#67726b]">加载中…</div>
            ) : (
                <div className="space-y-2">
                    {rows.map((row) => renderRow(row, row.id, "edit"))}
                    {draft ? renderRow(draft, "draft", "draft") : null}
                    {!rows.length && !draft ? <div className="py-6 text-center text-sm text-[#9aa49e]">暂无套餐，点击右上角「新增套餐」创建。</div> : null}
                </div>
            )}
        </section>
    );
}
