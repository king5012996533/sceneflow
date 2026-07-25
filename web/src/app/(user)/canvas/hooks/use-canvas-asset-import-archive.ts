"use client";

import { useCallback, useState } from "react";
import { nanoid } from "nanoid";
import { uploadImage } from "@/services/image-storage";
import { readImageMeta } from "@/lib/image-utils";
import { useAssetStore } from "@/stores/use-asset-store";
import { NODE_DEFAULT_SIZE } from "../constants";
import { CanvasNodeType } from "../types";
import type { CanvasNodeData, CanvasNodeMetadata, CanvasConnection, Position } from "../types";
import type { InsertAssetPayload } from "../components/asset-picker-modal";
import {
    VIDEO_NODE_MAX_WIDTH,
    VIDEO_NODE_MAX_HEIGHT,
    NODE_STATUS_SUCCESS,
    archiveCanvasNode,
    createCanvasNode,
    imageMetadata,
} from "../utils/canvas-utils";
import { fitNodeSize } from "../utils/canvas-node-size";

type UseCanvasAssetImportArchiveOptions = {
    projectId: string;
    getCanvasCenter: () => Position;
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
    setDialogNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    message: { info: (msg: string) => void; success: (msg: string) => void; error: (msg: string) => void; warning: (msg: string) => void };
};

export function useCanvasAssetImportArchive(options: UseCanvasAssetImportArchiveOptions) {
    const { projectId, getCanvasCenter, setNodes, setConnections, setSelectedNodeIds, setSelectedConnectionId, setDialogNodeId, message } = options;
    const addAsset = useAssetStore((state) => state.addAsset);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);

    const openAssetPicker = useCallback(() => {
        setAssetPickerOpen(true);
    }, []);

    const closeAssetPicker = useCallback(() => {
        setAssetPickerOpen(false);
    }, []);

    const saveNodeAsset = useCallback(
        async (node: CanvasNodeData) => {
            if (node.metadata?.assetLibraryId) {
                message.info("该内容已经在我的素材中");
                return;
            }
            const assetId = archiveCanvasNode(node, projectId, addAsset);
            if (!assetId) {
                message.error("当前节点没有可保存的内容");
                return;
            }
            setNodes((previous) =>
                previous.map((item) =>
                    item.id === node.id ? { ...item, metadata: { ...item.metadata, assetLibraryId: assetId, assetAutoArchived: true, assetReusable: true } } : item,
                ),
            );
            message.success("已加入我的素材");
        },
        [addAsset, message, projectId],
    );

    const handleAssetInsert = useCallback(
        async (payload: InsertAssetPayload) => {
            const insertedAssetMetadata: CanvasNodeMetadata = {
                assetLibraryId: payload.assetId,
                assetCategory: payload.metadata?.category,
                assetSource: payload.metadata?.origin === "platform-rental" ? "platform-rental" : "user-asset",
                assetLicense: payload.metadata?.license || "private",
                assetReusable: true,
                prompt: payload.metadata?.prompt || payload.metadata?.reusablePrompt,
                consistencyNotes: payload.metadata?.consistencyNotes,
            };
            if (payload.kind === "text") {
                const center = getCanvasCenter();
                const node = {
                    ...createCanvasNode(CanvasNodeType.Text, center, { ...insertedAssetMetadata, content: payload.content, status: NODE_STATUS_SUCCESS }),
                    title: payload.title,
                };
                setNodes((prev) => [...prev, node]);
                setSelectedNodeIds(new Set([node.id]));
                setSelectedConnectionId(null);
            } else if (payload.kind === "video") {
                const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Video];
                const center = getCanvasCenter();
                const id = `video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const nextSize = fitNodeSize(payload.width || spec.width, payload.height || spec.height, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
                setNodes((prev) => [
                    ...prev,
                    {
                        id,
                        type: CanvasNodeType.Video,
                        title: payload.title,
                        position: { x: center.x - nextSize.width / 2, y: center.y - nextSize.height / 2 },
                        width: nextSize.width,
                        height: nextSize.height,
                        metadata: {
                            ...insertedAssetMetadata,
                            content: payload.url,
                            storageKey: payload.storageKey,
                            status: NODE_STATUS_SUCCESS,
                            naturalWidth: payload.width,
                            naturalHeight: payload.height,
                        },
                    },
                ]);
                setSelectedNodeIds(new Set([id]));
            } else {
                const storedImage = payload.storageKey ? { url: payload.dataUrl, storageKey: payload.storageKey, width: 1, height: 1, bytes: 0, mimeType: "image/png" } : await uploadImage(payload.dataUrl);
                const meta = storedImage.width === 1 && storedImage.height === 1 ? await readImageMeta(storedImage.url) : storedImage;
                const config = fitNodeSize(meta.width, meta.height);
                const center = getCanvasCenter();
                const id = `image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const node: CanvasNodeData = {
                    id,
                    type: CanvasNodeType.Image,
                    title: payload.title,
                    position: { x: center.x - config.width / 2, y: center.y - config.height / 2 },
                    width: config.width,
                    height: config.height,
                    metadata: { ...imageMetadata({ ...storedImage, width: meta.width, height: meta.height }), ...insertedAssetMetadata, prompt: insertedAssetMetadata.prompt || payload.title },
                };
                setNodes((prev) => [...prev, node]);
                setSelectedNodeIds(new Set([id]));
                setSelectedConnectionId(null);
                setDialogNodeId(id);
            }
            setAssetPickerOpen(false);
        },
        [getCanvasCenter, setConnections, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds],
    );

    return {
        assetPickerOpen,
        setAssetPickerOpen,
        openAssetPicker,
        closeAssetPicker,
        saveNodeAsset,
        handleAssetInsert,
    };
}
