"use client";

import { Modal } from "antd";
import { CanvasNodeInfoModal } from "./canvas-node-hover-toolbar";
import { CanvasNodeCropDialog } from "./canvas-node-crop-dialog";
import type { CanvasImageCropRect } from "./canvas-node-crop-dialog";
import { CanvasNodeMaskEditDialog } from "./canvas-node-mask-edit-dialog";
import type { CanvasImageMaskEditPayload } from "./canvas-node-mask-edit-dialog";
import { CanvasNodeSplitDialog } from "./canvas-node-split-dialog";
import type { CanvasImageSplitParams } from "./canvas-node-split-dialog";
import { CanvasNodeUpscaleDialog } from "./canvas-node-upscale-dialog";
import type { CanvasImageUpscaleParams } from "./canvas-node-upscale-dialog";
import { CanvasNodeAngleDialog } from "./canvas-node-angle-dialog";
import type { CanvasImageAngleParams } from "./canvas-node-angle-dialog";
import type { CanvasNodeData } from "../types";

type CanvasImageDialogsHostProps = {
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    handleImageInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    infoNode: CanvasNodeData | null;
    setInfoNodeId: (value: string | null) => void;
    cropNode: CanvasNodeData | null;
    setCropNodeId: (value: string | null) => void;
    cropImageNode: (node: CanvasNodeData, crop: CanvasImageCropRect) => Promise<void>;
    maskEditNode: CanvasNodeData | null;
    setMaskEditNodeId: (value: string | null) => void;
    applyMaskEdit: (node: CanvasNodeData, payload: CanvasImageMaskEditPayload) => Promise<void>;
    splitNode: CanvasNodeData | null;
    setSplitNodeId: (value: string | null) => void;
    splitImageNode: (node: CanvasNodeData, params: CanvasImageSplitParams) => Promise<void>;
    upscaleNode: CanvasNodeData | null;
    setUpscaleNodeId: (value: string | null) => void;
    generateUpscaledImage: (node: CanvasNodeData, params: CanvasImageUpscaleParams) => Promise<void>;
    superResolveNode: CanvasNodeData | null;
    setSuperResolveNodeId: (value: string | null) => void;
    angleNode: CanvasNodeData | null;
    setAngleNodeId: (value: string | null) => void;
    generateAngleImage: (node: CanvasNodeData, params: CanvasImageAngleParams) => Promise<void>;
    previewNode: CanvasNodeData | null;
    setPreviewNodeId: (value: string | null) => void;
};

export function CanvasImageDialogsHost(props: CanvasImageDialogsHostProps) {
    const {
        imageInputRef,
        handleImageInputChange,
        infoNode,
        setInfoNodeId,
        cropNode,
        setCropNodeId,
        cropImageNode,
        maskEditNode,
        setMaskEditNodeId,
        applyMaskEdit,
        splitNode,
        setSplitNodeId,
        splitImageNode,
        upscaleNode,
        setUpscaleNodeId,
        generateUpscaledImage,
        superResolveNode,
        setSuperResolveNodeId,
        angleNode,
        setAngleNodeId,
        generateAngleImage,
        previewNode,
        setPreviewNodeId,
    } = props;

    return (
        <>
            <input ref={imageInputRef} type="file" accept="image/*,video/*,audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav" className="hidden" onChange={handleImageInputChange} />

            <CanvasNodeInfoModal node={infoNode} open={Boolean(infoNode)} onClose={() => setInfoNodeId(null)} />

            {cropNode?.metadata?.content ? <CanvasNodeCropDialog dataUrl={cropNode.metadata.content} open={Boolean(cropNode)} onClose={() => setCropNodeId(null)} onConfirm={(crop) => void cropImageNode(cropNode!, crop)} /> : null}

            {maskEditNode?.metadata?.content ? <CanvasNodeMaskEditDialog dataUrl={maskEditNode.metadata.content} open={Boolean(maskEditNode)} onClose={() => setMaskEditNodeId(null)} onConfirm={(payload) => void applyMaskEdit(maskEditNode!, payload)} /> : null}

            {splitNode?.metadata?.content ? <CanvasNodeSplitDialog dataUrl={splitNode.metadata.content} open={Boolean(splitNode)} onClose={() => setSplitNodeId(null)} onConfirm={(params) => void splitImageNode(splitNode!, params)} /> : null}

            {upscaleNode?.metadata?.content ? <CanvasNodeUpscaleDialog dataUrl={upscaleNode.metadata.content} open={Boolean(upscaleNode)} onClose={() => setUpscaleNodeId(null)} onConfirm={(params) => void generateUpscaledImage(upscaleNode!, params)} /> : null}

            <Modal title="AI 超分" open={Boolean(superResolveNode?.metadata?.content)} centered footer={null} onCancel={() => setSuperResolveNodeId(null)}>
                <div className="py-8 text-center text-base font-medium">暂未实现</div>
            </Modal>

            {angleNode?.metadata?.content ? <CanvasNodeAngleDialog dataUrl={angleNode.metadata.content} open={Boolean(angleNode)} onClose={() => setAngleNodeId(null)} onConfirm={(params) => void generateAngleImage(angleNode!, params)} /> : null}

            <Modal
                title="图片详情"
                open={Boolean(previewNode?.metadata?.content)}
                centered
                onCancel={() => setPreviewNodeId(null)}
                footer={null}
                width="auto"
                styles={{ body: { padding: 0, display: "flex", justifyContent: "center", alignItems: "center", maxHeight: "80vh" } }}
            >
                {previewNode?.metadata?.content ? (
                    <img
                        src={previewNode.metadata.content}
                        alt={previewNode.title || "图片"}
                        style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
                    />
                ) : null}
            </Modal>
        </>
    );
}
