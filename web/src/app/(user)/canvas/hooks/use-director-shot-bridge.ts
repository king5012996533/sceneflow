"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { CanvasConnection, CanvasNodeData, ContextMenuState, Position } from "../types";
import { CanvasNodeType } from "../types";
import { useThemeStore } from "@/stores/use-theme-store";
import { NODE_DEFAULT_SIZE } from "../constants";
import { fitNodeSize } from "../utils/canvas-node-size";
import {
    type DirectorPanoramaPayload,
    DIRECTOR_DESK_URL,
    NODE_STATUS_IDLE,
    NODE_STATUS_SUCCESS,
    resolveDirectorDeskUrl,
    imageMetadata,
} from "../utils/canvas-utils";
import { uploadImage } from "@/services/image-storage";
import { dataUrlToFile } from "@/lib/image-utils";
import { nanoid } from "nanoid";

type DirectorBridgeOptions = {
    nodes: CanvasNodeData[];
    projectId: string;
    getCanvasCenter: () => Position;
    nodesRef: React.MutableRefObject<CanvasNodeData[]>;
    connectionsRef: React.MutableRefObject<CanvasConnection[]>;
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: Dispatch<SetStateAction<Set<string>>>;
    setSelectedConnectionId: Dispatch<SetStateAction<string | null>>;
    setDialogNodeId: Dispatch<SetStateAction<string | null>>;
    setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
    showMessage: (msg: string) => void;
};

export function useDirectorShotBridge(options: DirectorBridgeOptions) {
    const {
        nodes,
        projectId,
        getCanvasCenter,
        nodesRef,
        connectionsRef,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setDialogNodeId,
        setContextMenu,
        showMessage,
    } = options;

    const directorIframeRef = useRef<HTMLIFrameElement>(null);
    const [directorNodeId, setDirectorNodeId] = useState<string | null>(null);
    const colorTheme = useThemeStore((state) => state.theme);

    const directorNode = useMemo(() => {
        if (!directorNodeId) return null;
        return nodes.find((n) => n.id === directorNodeId) || null;
    }, [directorNodeId, nodes]);

    const directorDeskUrl = useMemo((): URL | null => {
        if (!directorNode) return null;
        return resolveDirectorDeskUrl(directorNode.metadata?.directorUrl || DIRECTOR_DESK_URL);
    }, [directorNode]);

    const directorDeskOrigin = directorDeskUrl?.origin || "";
    const directorDeskSrc = useMemo(() => {
        if (!directorDeskUrl) return "";
        const url = new URL(directorDeskUrl.toString());
        url.searchParams.set("theme", colorTheme);
        if (typeof window !== "undefined") url.searchParams.set("hostOrigin", window.location.origin);
        return url.toString();
    }, [colorTheme, directorDeskUrl]);

    const openDirectorShot = useCallback(
        (node: CanvasNodeData) => {
            setSelectedNodeIds(new Set([node.id]));
            setSelectedConnectionId(null);
            setDialogNodeId(null);
            setDirectorNodeId(node.id);
        },
        [setDialogNodeId, setSelectedConnectionId, setSelectedNodeIds],
    );

    const createDirectorShotNode = useCallback(() => {
        const center = getCanvasCenter();
        const id = `director-shot-${nanoid()}`;
        const node: CanvasNodeData = {
            id,
            type: CanvasNodeType.DirectorShot,
            title: "3D 镜头",
            position: { x: center.x - 210, y: center.y - 140 },
            width: 420,
            height: 280,
            metadata: {
                content: "",
                status: NODE_STATUS_IDLE,
                pipelineKind: "director-shot",
                pipelineLabel: "3D 镜头",
                pipelineDescription: "用 3D 导演台控制场景、角色、机位和关键帧",
                assetCategory: "storyboard",
                assetSource: "manual",
                assetReusable: true,
                directorSessionId: `${projectId}:${id}`,
                directorUrl: DIRECTOR_DESK_URL,
                directorCaptureCount: 0,
            },
        };
        node.title = "3D Shot";
        node.metadata = {
            ...node.metadata,
            pipelineLabel: "3D Shot",
            pipelineDescription: "Scene, character, camera and keyframe control from the 3D Director.",
        };
        setNodes((prev) => [...prev, node]);
        setSelectedNodeIds(new Set([id]));
        setSelectedConnectionId(null);
        setDialogNodeId(null);
        setDirectorNodeId(id);
    }, [getCanvasCenter, projectId, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds]);

    const importDirectorCaptures = useCallback(
        async (sourceNode: CanvasNodeData, payload: unknown) => {
            const captures = Array.isArray((payload as { captures?: unknown[] })?.captures)
                ? ((payload as { captures: unknown[] }).captures)
                : [];
            const normalizedCaptures = captures
                .map((capture, index) => {
                    const item = capture as { dataUrl?: unknown; fileName?: unknown };
                    return {
                        dataUrl: typeof item.dataUrl === "string" ? item.dataUrl : "",
                        fileName:
                            typeof item.fileName === "string" && item.fileName.trim()
                                ? item.fileName.trim()
                                : `director-shot-${index + 1}.png`,
                    };
                })
                .filter((capture) => capture.dataUrl);
            if (!normalizedCaptures.length) return;

            const imageConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
            const uploaded = await Promise.all(
                normalizedCaptures.map((capture) =>
                    uploadImage(
                        dataUrlToFile({ id: nanoid(), name: capture.fileName, type: "image/png", dataUrl: capture.dataUrl }),
                    ),
                ),
            );
            const createdAt = new Date().toISOString();
            const childNodes = uploaded.map((image, index) => {
                const size = fitNodeSize(image.width, image.height, imageConfig.width, imageConfig.height);
                const id = `image-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
                return {
                    id,
                    type: CanvasNodeType.Image,
                    title: normalizedCaptures[index]?.fileName.replace(/\.[^.]+$/, "") || `3D 镜头截图 ${index + 1}`,
                    position: {
                        x: sourceNode.position.x + sourceNode.width + 96 + (index % 2) * (imageConfig.width + 36),
                        y: sourceNode.position.y + Math.floor(index / 2) * (imageConfig.height + 36),
                    },
                    width: size.width,
                    height: size.height,
                    metadata: {
                        ...imageMetadata(image),
                        assetCategory: "keyframe",
                        assetSource: "manual",
                        assetReusable: true,
                        pipelineKind: "director-shot-capture",
                        pipelineLabel: "3D 截图",
                        pipelineDescription: `来自 ${sourceNode.title || "3D 镜头"}`,
                    },
                } satisfies CanvasNodeData;
            });
            childNodes.forEach((node, index) => {
                node.title = normalizedCaptures[index]?.fileName.replace(/\.[^.]+$/, "") || `3D capture ${index + 1}`;
                node.metadata = {
                    ...node.metadata,
                    pipelineLabel: "3D Capture",
                    pipelineDescription: `From ${sourceNode.title || "3D Shot"}`,
                };
            });

            setNodes((prev) => [
                ...prev.map((node) =>
                    node.id === sourceNode.id
                        ? {
                              ...node,
                              metadata: {
                                  ...node.metadata,
                                  content: uploaded[0]?.url || node.metadata?.content,
                                  status: NODE_STATUS_SUCCESS,
                                  directorLastCaptureAt: createdAt,
                                  directorCaptureCount: (node.metadata?.directorCaptureCount || 0) + uploaded.length,
                              },
                          }
                        : node,
                ),
                ...childNodes,
            ]);
            setConnections((prev) => [
                ...prev,
                ...childNodes.map((child) => ({ id: nanoid(), fromNodeId: sourceNode.id, toNodeId: child.id })),
            ]);
            setSelectedNodeIds(new Set(childNodes.map((node) => node.id)));
            setSelectedConnectionId(null);
            setDialogNodeId(null);
            showMessage(`已回写 ${childNodes.length} 张 3D 镜头截图`);
        },
        [setConnections, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds, showMessage],
    );

    const persistDirectorProject = useCallback(
        (sourceNode: CanvasNodeData, payload: unknown) => {
            const data = (payload || {}) as { project?: unknown; revision?: unknown; updatedAt?: unknown };
            if (!data.project || typeof data.project !== "object") return;

            const revision = typeof data.revision === "string" ? data.revision : "";
            const updatedAt = typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString();
            setNodes((prev) =>
                prev.map((node) => {
                    if (node.id !== sourceNode.id) return node;
                    if (revision && node.metadata?.directorProjectRevision === revision) return node;
                    return {
                        ...node,
                        metadata: {
                            ...node.metadata,
                            directorProject: data.project,
                            directorProjectRevision: revision || node.metadata?.directorProjectRevision,
                            directorProjectUpdatedAt: updatedAt,
                        },
                    };
                }),
            );
        },
        [setNodes],
    );

    const getDirectorPanoramaPayload = useCallback(
        (targetNode: CanvasNodeData): DirectorPanoramaPayload | null => {
            for (const incomingConnection of connectionsRef.current) {
                if (incomingConnection.toNodeId !== targetNode.id) continue;

                const sourceNode = nodesRef.current.find((node) => node.id === incomingConnection.fromNodeId);
                if (!sourceNode || sourceNode.type !== CanvasNodeType.Image) continue;

                const imageUrl = typeof sourceNode.metadata?.content === "string" ? sourceNode.metadata.content : "";
                if (!imageUrl) continue;

                return {
                    edgeId: incomingConnection.id,
                    sourceNodeId: sourceNode.id,
                    imageUrl,
                    fileName: `${sourceNode.title || "canvas-image"}.png`,
                };
            }

            return null;
        },
        [connectionsRef, nodesRef],
    );

    const postDirectorPanorama = useCallback(
        (targetNode: CanvasNodeData) => {
            if (!directorIframeRef.current?.contentWindow) return;
            const panorama = getDirectorPanoramaPayload(targetNode);
            if (!panorama) return;

            directorIframeRef.current.contentWindow.postMessage(
                {
                    type: "storyai:director-desk-panorama",
                    payload: panorama,
                },
                directorDeskOrigin || "*",
            );
        },
        [directorDeskOrigin, getDirectorPanoramaPayload],
    );

    const postDirectorSession = useCallback(() => {
        if (!directorNode || !directorIframeRef.current?.contentWindow) return;
        directorIframeRef.current.contentWindow.postMessage(
            {
                type: "storyai:director-desk-session",
                payload: {
                    instanceId: directorNode.metadata?.directorSessionId || directorNode.id,
                    theme: colorTheme,
                    project: directorNode.metadata?.directorProject,
                },
            },
            directorDeskOrigin || "*",
        );
        postDirectorPanorama(directorNode);
    }, [colorTheme, directorDeskOrigin, directorNode, postDirectorPanorama]);

    useEffect(() => {
        if (!directorNode) return;
        const activeDirectorNode = directorNode;

        function handleDirectorMessage(event: MessageEvent) {
            if (directorDeskOrigin && event.origin !== directorDeskOrigin) return;
            const type = typeof event.data?.type === "string" ? event.data.type : "";
            if (type === "storyai:director-desk-ready") {
                postDirectorSession();
                return;
            }
            if (type === "storyai:director-desk-close") {
                setDirectorNodeId(null);
                return;
            }
            if (type === "storyai:director-desk-captures-sent") {
                void importDirectorCaptures(activeDirectorNode, event.data?.payload);
                return;
            }
            if (type === "storyai:director-desk-project-changed") {
                persistDirectorProject(activeDirectorNode, event.data?.payload);
                return;
            }
            if (type === "storyai:director-desk-panorama-removed") {
                const edgeId = typeof event.data?.payload?.edgeId === "string" ? event.data.payload.edgeId : "";
                if (edgeId) {
                    setConnections((prev) => prev.filter((connection) => connection.id !== edgeId));
                    setSelectedConnectionId((current) => (current === edgeId ? null : current));
                }
            }
        }

        window.addEventListener("message", handleDirectorMessage);
        return () => window.removeEventListener("message", handleDirectorMessage);
    }, [
        directorDeskOrigin,
        directorNode,
        importDirectorCaptures,
        persistDirectorProject,
        postDirectorSession,
        setConnections,
        setSelectedConnectionId,
    ]);

    return {
        directorIframeRef,
        directorNodeId,
        setDirectorNodeId,
        directorDeskUrl,
        directorDeskOrigin,
        directorDeskSrc,
        directorNode,
        openDirectorShot,
        createDirectorShotNode,
        // Expose these for testing/debugging; consumed internally by the effect
        importDirectorCaptures,
        persistDirectorProject,
        postDirectorPanorama,
        postDirectorSession,
    };
}
