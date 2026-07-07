"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Button } from "antd";
import { Download, FileUp, Plus } from "lucide-react";

import { LoginModal } from "@/components/layout/login-modal";
import { fetchClientEntitlements, isOverLimit, type ClientEntitlements } from "@/lib/client-entitlements";
import { readZip } from "@/lib/zip";
import { setMediaBlob } from "@/services/file-storage";
import { setImageBlob } from "@/services/image-storage";
import { useUserStore } from "@/stores/use-user-store";
import { CanvasDeleteProjectsDialog } from "./components/canvas-delete-projects-dialog";
import { CanvasProjectCard } from "./components/canvas-project-card";
import type { CanvasExportFile } from "./export-types";
import { useCanvasStore, type CanvasProject } from "./stores/use-canvas-store";
import { useCanvasUiStore } from "./stores/use-canvas-ui-store";
import { exportCanvasProjects } from "./utils/canvas-export";

export default function CanvasPage() {
    return (
        <Suspense fallback={<main className="flex h-full items-center justify-center bg-background text-sm text-stone-500">加载中...</main>}>
            <CanvasPageInner />
        </Suspense>
    );
}

function CanvasPageInner() {
    const { message } = App.useApp();
    const router = useRouter();
    const searchParams = useSearchParams();
    const user = useUserStore((state) => state.user);
    const inputRef = useRef<HTMLInputElement>(null);
    const autoOpenRef = useRef(false);
    const hydrated = useCanvasStore((state) => state.hydrated);
    const projects = useCanvasStore((state) => state.projects);
    const createProject = useCanvasStore((state) => state.createProject);
    const importProject = useCanvasStore((state) => state.importProject);
    const selectedIds = useCanvasUiStore((state) => state.selectedProjectIds);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const [entitlements, setEntitlements] = useState<ClientEntitlements | null>(null);

    const mode = searchParams.get("mode");
    const agentMode = mode === "new" || mode === "recent" || mode === "choose";
    const agentQuery = agentMode ? `?${searchParams.toString()}` : "";
    const projectLimit = entitlements?.projects ?? 3;
    const projectLimitReached = isOverLimit(projects.length, projectLimit);

    const enterProject = (id: string) => {
        router.push(`/canvas/${id}${agentQuery}`);
    };

    const warnProjectLimit = () => {
        if (projectLimit === null) return;
        message.warning(`当前套餐最多创建 ${projectLimit} 个画布项目，请联系管理员申请开通套餐权益。`);
    };

    const handleExport = async (projectsToExport: CanvasProject[], name: string) => {
        try { await exportCanvasProjects(projectsToExport, name); }
        catch (err) { message.error(err instanceof Error ? err.message : "导出失败"); }
    };

    const createAndEnter = () => {
        if (projectLimitReached) {
            warnProjectLimit();
            return;
        }
        enterProject(createProject(`无限画布 ${projects.length + 1}`));
    };

    const importCanvas = async (file?: File) => {
        if (!file) return;
        try {
            const zip = await readZip(file);
            const projectFile = zip.get("projects.json");
            if (!projectFile) throw new Error("missing projects.json");
            const data = JSON.parse(await projectFile.text()) as CanvasExportFile;

            if (projectLimit !== null && projects.length + data.projects.length > projectLimit) {
                message.warning(`当前套餐最多保留 ${projectLimit} 个画布项目，无法导入 ${data.projects.length} 个项目。`);
                return;
            }

            await Promise.all(
                data.projects.flatMap((project) =>
                    project.files.map(async (item) => {
                        const blob = zip.get(item.path);
                        if (!blob) return;
                        const typedBlob = blob.type ? blob : blob.slice(0, blob.size, item.mimeType);
                        await (item.storageKey.startsWith("image:") ? setImageBlob(item.storageKey, typedBlob) : setMediaBlob(item.storageKey, typedBlob));
                    }),
                ),
            );
            data.projects.forEach((item) => importProject(item.project));
            message.success(`已导入 ${data.projects.length} 个画布`);
        } catch {
            message.error("导入失败，请选择有效的画布压缩包");
        } finally {
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    useEffect(() => {
        if (!user) {
            setEntitlements(null);
            return;
        }
        void fetchClientEntitlements().then(setEntitlements);
    }, [user]);

    useEffect(() => {
        if (!hydrated || autoOpenRef.current || (mode !== "new" && mode !== "recent")) return;
        if (mode === "new" && projectLimitReached) {
            autoOpenRef.current = true;
            warnProjectLimit();
            router.replace("/canvas");
            return;
        }
        autoOpenRef.current = true;
        enterProject(mode === "new" ? createProject(`无限画布 ${projects.length + 1}`) : projects[0]?.id || createProject(`无限画布 ${projects.length + 1}`));
    }, [createProject, hydrated, mode, projectLimitReached, projects, router]);

    // 云端同步：项目变更后自动备份
    useEffect(() => {
        if (!hydrated || !user || !projects.length) return;
        const timer = setTimeout(async () => {
            try {
                await fetch("/canvas/api/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ type: "projects", data: projects }),
                });
            } catch { /* 静默失败，下次同步重试 */ }
        }, 5000);
        return () => clearTimeout(timer);
    }, [hydrated, user, projects]);

    // 从云端恢复
    const restoreFromCloud = async () => {
        try {
            const res = await fetch("/canvas/api/sync?type=projects", { credentials: "include" });
            const data = await res.json();
            if (data.data?.length) {
                const count = data.data.length;
                // 增量合并，不覆盖本地已有项目
                const localIds = new Set(projects.map((p) => p.id));
                let added = 0;
                for (const project of data.data) {
                    if (!localIds.has(project.id)) {
                        importProject(project);
                        added++;
                    }
                }
                message.success(`从云端恢复了 ${added} 个项目`);
                if (!added) message.info("云端与本地数据一致，无需恢复");
            } else {
                message.info("云端暂无备份数据");
            }
        } catch {
            message.error("云端恢复失败");
        }
    };

    if (hydrated && (mode === "new" || mode === "recent")) return <main className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fbf7ef_0%,#f7f3ea_48%,#eef4ff_100%)] text-sm text-[#746b7a]">正在打开画布...</main>;

    if (!user) {
        return (
            <main className="flex h-full flex-col items-center justify-center bg-[linear-gradient(135deg,#fbf7ef_0%,#f7f3ea_48%,#eef4ff_100%)] text-[#172033]">
                <LoginModal open={true} onClose={() => router.push("/")} />
                <p className="text-sm text-[#746b7a]">请先登录后再使用画布</p>
            </main>
        );
    }

    return (
        <main className="h-full overflow-auto bg-[linear-gradient(135deg,#fbf7ef_0%,#f7f3ea_48%,#eef4ff_100%)] text-[#172033]">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
                <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ded3c4] pb-6">
                    <div>
                        <p className="text-xs text-[#8a7f91]">画布库</p>
                        <h1 className="mt-3 text-3xl font-semibold">无限画布</h1>
                        <p className="mt-2 text-sm text-[#746b7a]">
                            当前项目数：{projects.length}
                            {projectLimit === null ? " / 不限" : ` / ${projectLimit}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedIds.length ? (
                            <>
                                <Button disabled={!hydrated} icon={<Download className="size-4" />} onClick={() => void handleExport(projects.filter((project) => selectedIds.includes(project.id)), `无限画布-${selectedIds.length}个项目`)}>
                                    导出选中
                                </Button>
                                <Button disabled={!hydrated} onClick={() => setDeleteIds(selectedIds)}>
                                    删除选中
                                </Button>
                            </>
                        ) : null}
                        {projects.length ? (
                            <Button disabled={!hydrated} onClick={() => setDeleteIds(projects.map((project) => project.id))}>
                                删除全部
                            </Button>
                        ) : null}
                        <Button disabled={!hydrated || projectLimitReached} icon={<FileUp className="size-4" />} onClick={() => inputRef.current?.click()}>
                            导入画布
                        </Button>
                        <Button disabled={!hydrated || projectLimitReached} type="primary" icon={<Plus className="size-4" />} onClick={createAndEnter}>
                            新建画布
                        </Button>
                    </div>
                </header>

                {!hydrated ? (
                    <section className="flex min-h-[360px] items-center justify-center rounded-2xl border border-white/70 bg-white/62 text-sm text-[#746b7a] shadow-[0_20px_70px_rgba(57,48,34,0.07)] backdrop-blur">正在加载画布...</section>
                ) : projects.length ? (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {projects.map((project) => (
                            <CanvasProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                ) : (
                    <section className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-white/70 bg-white/62 text-center shadow-[0_24px_80px_rgba(57,48,34,0.08)] backdrop-blur">
                        <h2 className="text-xl font-medium">还没有画布</h2>
                        <p className="mt-3 text-sm text-[#746b7a]">新建一个画布后，就可以独立保存节点、连线和画布外观。</p>
                        <Button type="primary" className="mt-6" icon={<Plus className="size-4" />} onClick={createAndEnter}>
                            新建画布
                        </Button>
                    </section>
                )}
            </div>

            <input ref={inputRef} type="file" accept="application/zip,.zip" className="hidden" onChange={(event) => void importCanvas(event.target.files?.[0])} />
            <CanvasDeleteProjectsDialog />
        </main>
    );
}
