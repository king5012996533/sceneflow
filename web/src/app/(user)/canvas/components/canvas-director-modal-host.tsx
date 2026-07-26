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
            ) : null}
        </Modal>
    );
}
