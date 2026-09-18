"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Empty } from "antd";

import { apiPath } from "@/lib/app-paths";

type MediaItem = {
    index: number;
    archived: boolean;
    available: boolean;
    url: string;
    downloadUrl: string;
    mimeType: string;
    bytes: number;
};

type GenerationRecord = {
    id: string;
    kind: string;
    status: string;
    creditsCost: number;
    quotaRefunded: boolean;
    error: string | null;
    createdAt: string;
    finishedAt: string | null;
    recovered: boolean;
    model: string;
    size: string;
    media: MediaItem[];
};

const PAGE_SIZE = 20;

const KIND_FILTERS = [
    { value: "", label: "全部" },
    { value: "image", label: "图片" },
    { value: "video", label: "视频" },
    { value: "audio", label: "音频" },
];

const KIND_LABEL: Record<string, string> = { image: "图片", video: "视频", audio: "音频", text: "文本", tool: "工具" };

const STATUS_META: Record<string, { label: string; className: string }> = {
    running: { label: "生成中", className: "border-[#a0713f]/30 bg-[#f7ede1] text-[#a0713f]" },
    succeeded: { label: "已完成", className: "border-emerald-600/25 bg-emerald-50 text-emerald-700" },
    failed: { label: "失败", className: "border-rose-500/25 bg-rose-50 text-rose-600" },
    cancelled: { label: "已取消", className: "border-[#e2dfdc] bg-[#f5f2f0] text-[#726d67]" },
};

function statusMeta(status: string) {
    return STATUS_META[status] || { label: status, className: "border-[#e2dfdc] bg-[#f5f2f0] text-[#726d67]" };
}

function formatBytes(bytes: number) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function creditLine(record: GenerationRecord) {
    if (record.status === "succeeded") return `扣除 ${record.creditsCost} 积分`;
    if (record.quotaRefunded) return `已退还 ${record.creditsCost} 积分`;
    if (record.status === "running") return `预扣 ${record.creditsCost} 积分`;
    return record.creditsCost ? `扣 ${record.creditsCost} 积分` : "";
}

/** 「我的生成记录」：任务清单 + 成品下载。服务端归档过的成品都从这里取，不再依赖第三方直链的时效。 */
export default function RecordsPage() {
    const [records, setRecords] = useState<GenerationRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [retentionDays, setRetentionDays] = useState(2);
    const [kind, setKind] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async (nextSkip: number, nextKind: string) => {
        const isFirst = nextSkip === 0;
        if (isFirst) setLoading(true);
        else setLoadingMore(true);
        try {
            const params = new URLSearchParams({ take: String(PAGE_SIZE), skip: String(nextSkip) });
            if (nextKind) params.set("kind", nextKind);
            const res = await fetch(apiPath(`/api/generation/records?${params.toString()}`), { credentials: "include", cache: "no-store" });
            const data = (await res.json().catch(() => null)) as { records?: GenerationRecord[]; total?: number; retentionDays?: number } | null;
            if (!res.ok) throw new Error("加载失败");
            setRecords((prev) => (isFirst ? data?.records || [] : [...prev, ...(data?.records || [])]));
            setTotal(data?.total || 0);
            if (typeof data?.retentionDays === "number") setRetentionDays(data.retentionDays);
            setFailed(false);
        } catch {
            if (isFirst) setRecords([]);
            setFailed(true);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        void load(0, kind);
    }, [kind, load]);

    const hasMore = records.length > 0 && records.length < total;

    return (
        <main className="h-full overflow-y-auto bg-[linear-gradient(135deg,#fbf7ef_0%,#f7f3ea_48%,#f9f7f5_100%)] px-6 py-10 text-[#23201c]">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-[#726d67]">GENERATION LOG</div>
                        <h1 className="text-2xl font-semibold tracking-tight">生成记录</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#726d67]">
                            成品由服务器统一保存，保留 {retentionDays} 天，过期自动清理。中断、刷新、关掉页面也不会丢：服务端会把上游已经产出的成品补取回来， 标着「服务端找回」的记录就是这一类，可直接下载。
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void load(0, kind)}
                        disabled={loading}
                        className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#e2dfdc] bg-[#ffffff] px-3 text-xs font-semibold text-[#332f2a] transition hover:border-[#a0713f] disabled:opacity-60"
                    >
                        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                        刷新
                    </button>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-1.5">
                    {KIND_FILTERS.map((item) => (
                        <button
                            key={item.value || "all"}
                            type="button"
                            onClick={() => setKind(item.value)}
                            className={
                                item.value === kind
                                    ? "h-8 rounded-full bg-[#332f2a] px-3.5 text-xs font-semibold text-[#ffffff]"
                                    : "h-8 rounded-full border border-[#e2dfdc] bg-[#ffffff] px-3.5 text-xs font-medium text-[#726d67] transition hover:border-[#a0713f] hover:text-[#332f2a]"
                            }
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[0, 1, 2].map((index) => (
                            <div key={index} className="h-64 animate-pulse rounded-2xl border border-[#e2dfdc] bg-white/60" />
                        ))}
                    </div>
                ) : records.length ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {records.map((record) => (
                                <RecordCard key={record.id} record={record} />
                            ))}
                        </div>
                        <div className="mt-5 flex justify-center">
                            {hasMore ? (
                                <button
                                    type="button"
                                    onClick={() => void load(records.length, kind)}
                                    disabled={loadingMore}
                                    className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#e2dfdc] bg-[#ffffff] px-4 text-xs font-semibold text-[#332f2a] transition hover:border-[#a0713f] disabled:opacity-60"
                                >
                                    {loadingMore ? <Loader2 className="size-3.5 animate-spin" /> : null}
                                    加载更多（{records.length}/{total}）
                                </button>
                            ) : (
                                <span className="text-xs text-[#a49f9a]">已显示全部 {total} 条</span>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="rounded-2xl border border-[#e2dfdc] bg-white/78 py-16 shadow-[0_20px_60px_rgba(51,47,42,0.06)]">
                        <Empty description={failed ? "加载失败，请稍后重试" : "还没有生成记录，去创作台或画布生成一张试试"} />
                    </div>
                )}
            </div>
        </main>
    );
}

function RecordCard({ record }: { record: GenerationRecord }) {
    const status = statusMeta(record.status);
    const meta = [KIND_LABEL[record.kind] || record.kind, record.model, record.size].filter(Boolean);
    return (
        <article className="flex flex-col rounded-2xl border border-[#e2dfdc] bg-white/78 p-4 shadow-[0_20px_60px_rgba(51,47,42,0.06)]">
            <div className="flex items-center gap-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                {record.recovered ? (
                    <span className="flex items-center gap-1 rounded-full border border-[#a0713f]/30 bg-[#f7ede1] px-2 py-0.5 text-[11px] font-semibold text-[#a0713f]">
                        <Sparkles className="size-3" />
                        服务端找回
                    </span>
                ) : null}
                {record.media.length > 1 ? <span className="text-[11px] text-[#a49f9a]">{record.media.length} 张</span> : null}
            </div>

            <div className="mt-3 space-y-2">
                {record.media.length ? (
                    record.media.slice(0, 4).map((item) => <MediaPreview key={item.index} record={record} item={item} />)
                ) : (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-[#e2dfdc] px-3 text-center text-xs text-[#726d67]">{record.status === "running" ? "生成中…" : "没有成品"}</div>
                )}
            </div>

            {/* 只在不成功的任务上展示原因：成品已经拿到的任务挂一句「连接中断/请求失败」只会让人以为白花钱 */}
            {record.status !== "succeeded" && record.error ? <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[#a3342c]">{record.error}</p> : null}

            <div className="mt-3 space-y-1 text-[11px] text-[#726d67]">
                <div className="font-medium text-[#47423c]">{meta.join(" · ")}</div>
                <div>{new Date(record.createdAt).toLocaleString("zh-CN")}</div>
                {creditLine(record) ? <div>{creditLine(record)}</div> : null}
            </div>

            {record.media.some((item) => item.available) ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {record.media
                        .filter((item) => item.available)
                        .slice(0, 4)
                        .map((item) => (
                            <span key={item.index} className="flex items-center gap-1">
                                <a href={item.downloadUrl} className="flex h-8 items-center gap-1 rounded-[9px] bg-[#a0713f] px-2.5 text-[11px] font-semibold text-[#ffffff] transition hover:bg-[#8a4f2b]">
                                    <Download className="size-3.5" />
                                    下载{record.media.length > 1 ? ` ${item.index + 1}` : ""}
                                </a>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-8 items-center gap-1 rounded-[9px] border border-[#e2dfdc] bg-[#ffffff] px-2.5 text-[11px] font-semibold text-[#332f2a] transition hover:border-[#a0713f]"
                                >
                                    <ExternalLink className="size-3.5" />
                                    预览
                                </a>
                            </span>
                        ))}
                </div>
            ) : null}
        </article>
    );
}

function MediaPreview({ record, item }: { record: GenerationRecord; item: MediaItem }) {
    // 归档文件读得出来但解不开（上游当年给的就是坏文件/截断文件）时，浏览器只会给一个破图图标。
    // 这里退化成一个说人话的占位：文件其实还在，点「下载」就能拿原件核对。
    const [broken, setBroken] = useState(false);
    if (!item.available || broken) {
        const message = item.available ? "预览加载失败，可点下方「下载」取原件" : item.archived ? "成品已过保留期，服务器已自动清理" : "未取回成品（上游直链已失效）";
        return <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-[#e2dfdc] px-3 text-center text-xs leading-relaxed text-[#726d67]">{message}</div>;
    }
    if (record.kind === "video") {
        return <video src={item.url} controls preload="metadata" onError={() => setBroken(true)} className="aspect-[4/3] w-full rounded-xl border border-[#e2dfdc] bg-[#000000]" />;
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt="生成成品" onError={() => setBroken(true)} className="aspect-[4/3] w-full rounded-xl border border-[#e2dfdc] object-cover" />
    );
}
