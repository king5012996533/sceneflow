const cutEditorUrl = process.env.NEXT_PUBLIC_SCENEFLOW_CUT_URL || "http://localhost:3400/projects";

export default function CutEditorPage() {
    return (
        <main className="h-[calc(100vh-4rem)] overflow-hidden bg-white">
            <iframe
                src={cutEditorUrl}
                title="SceneFlow 后期剪辑器"
                className="h-full w-full border-0"
                allow="clipboard-read; clipboard-write; fullscreen"
            />
        </main>
    );
}
