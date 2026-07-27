"use client";

import { Modal } from "antd";
import type { CanvasNodeData } from "../types";

type CanvasDirectorModalHostProps = {
    directorNode: CanvasNodeData | null;
    directorDeskSrc: string | null;
    directorIframeRef: React.RefObject<HTMLIFrameElement | null>;
    onClose: () => void;
    onLoad: () => void;
};

export function CanvasDirectorModalHost(props: CanvasDirectorModalHostProps) {
    const { directorNode, directorDeskSrc, directorIframeRef, onClose, onLoad } = props;

    return (
        <Modal
            title={directorNode?.title || "3D 镜头导演台"}
            open={Boolean(directorNode)}
            centered
            width="96vw"
            footer={null}
            destroyOnClose
            onCancel={onClose}
            styles={{ body: { height: "82vh", padding: 0, overflow: "hidden", background: "#090909" } }}
        >
            {directorDeskSrc ? (
                <iframe
                    ref={directorIframeRef}
                    title="3D 镜头导演台"
                    src={directorDeskSrc}
                    className="block h-full w-full border-0"
                    allow="clipboard-read; clipboard-write"
                    onLoad={onLoad}
                />
            ) : (
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <div className="mb-4 text-4xl">🎬</div>
                        <h3 className="mb-2 text-lg font-semibold text-white">3D 镜头导演台</h3>
                        <p className="text-sm text-white/50">功能正在开发中，即将上线</p>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/40">
                            <span className="size-1.5 rounded-full bg-yellow-500 animate-pulse" />
                            Coming Soon
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
