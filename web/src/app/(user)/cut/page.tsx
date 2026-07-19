export default function CutEditorPage() {
    return (
        <main className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center bg-[#0a0a0f] text-white">
            <div className="max-w-md text-center">
                <div className="mb-6 text-6xl">🎬</div>
                <h1 className="mb-3 text-2xl font-semibold">后期剪辑器</h1>
                <p className="mb-6 text-sm text-white/50">
                    专业视频剪辑功能正在开发中，即将上线。
                </p>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/40">
                    <span className="size-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    Coming Soon
                </div>
            </div>
        </main>
    );
}
