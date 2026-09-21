"use client";

import { useEffect } from "react";

import { useCanvasStore } from "../stores/use-canvas-store";
import { pushProjectsBackup } from "../utils/cloud-sync";

/** 内容安静下来多久才推云端（画布库页与项目页共用同一个数，不许各写一套） */
export const CLOUD_BACKUP_DEBOUNCE_MS = 5000;

/**
 * 画布库 → 云端的自动备份。
 *
 * 触发点必须两处都挂：画布库页（项目列表变了）和项目页（画布内容变了）。
 * 只挂画布库那一处会漏掉最常见的一种用法 —— 从书签直接进某块画布干活、从不回画布库，
 * 于是云端那份备份永远是旧的或空的；而「从云端恢复」只补齐、不覆盖，云端越旧，
 * 换设备或清缓存时能救回来的就越少。
 *
 * 两个约定：
 * - 空列表一律不推。本地还没水合完（或用户把画布全删了）就先推空列表，等于把云端那份备份删了。
 * - 推的是「此刻」的整份画布库，不是某个时刻的快照：防抖过程中继续改也没关系，最后推的是最新的。
 *
 * @param enabled 未登录、还没水合完成、工程还没加载完时传 false
 */
export function useCanvasCloudBackup(enabled: boolean): void {
    useEffect(() => {
        if (!enabled) return;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const push = () => {
            const projects = useCanvasStore.getState().projects;
            if (!projects.length) return;
            void pushProjectsBackup(projects);
        };
        const schedule = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                push();
            }, CLOUD_BACKUP_DEBOUNCE_MS);
        };
        // 进页面先排一次：把「浏览器本地才是权威、云端只是旧副本」这件事顺手纠正过来
        schedule();
        const unsubscribe = useCanvasStore.subscribe((state, prev) => {
            if (state.projects !== prev.projects) schedule();
        });
        return () => {
            if (timer) clearTimeout(timer);
            unsubscribe();
        };
    }, [enabled]);
}
