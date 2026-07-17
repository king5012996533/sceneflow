import { ExternalLink, Scissors } from "lucide-react";

const cutEditorUrl = process.env.NEXT_PUBLIC_SCENEFLOW_CUT_URL || "http://localhost:3400/projects";

export default function CutEditorPage() {
    return (
        <main className="flex min-h-[calc(100vh-4rem)] flex-col bg-[#f7f3ec] text-[#172033]">
            <section className="border-b border-[#ded3c4] bg-[#fffefa] px-6 py-4 shadow-[0_12px_30px_rgba(35,28,20,0.08)]">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#ded3c4] bg-[#f8f5ef] px-3 py-1 text-xs font-medium text-[#6d6472]">
                            <Scissors className="size-3.5" />
                            SceneFlow Cut
                        </div>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">后期剪辑器</h1>
                        <p className="mt-1 text-sm leading-6 text-[#6d6472]">独立承载剪辑工作台，先打通最后一公里交付；后续再接入素材库、资产回流和剪辑 Agent。</p>
                    </div>
                    <a
                        href={cutEditorUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cfc5ff] bg-white px-4 text-sm font-medium text-[#4f5dff] shadow-[0_8px_20px_rgba(79,93,255,0.12)] transition hover:bg-[#f5f2ff]"
                    >
                        新窗口打开
                        <ExternalLink className="size-4" />
                    </a>
                </div>
            </section>

            <section className="min-h-0 flex-1 p-4">
                <div className="mx-auto h-[calc(100vh-10.5rem)] max-w-[1600px] overflow-hidden rounded-2xl border border-[#ded3c4] bg-white shadow-[0_24px_70px_rgba(35,28,20,0.12)]">
                    <iframe
                        src={cutEditorUrl}
                        title="SceneFlow 后期剪辑器"
                        className="h-full w-full border-0"
                        allow="clipboard-read; clipboard-write; fullscreen"
                    />
                </div>
            </section>
        </main>
    );
}
