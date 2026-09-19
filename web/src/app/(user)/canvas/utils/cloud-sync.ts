/**
 * 画布列表 → 云端备份。
 *
 * 抽成独立函数是为了让「删除」也能立刻推一次：项目变更的自动同步副作用有意跳过空列表
 * （避免本地还没恢复就先拿空列表把云端覆盖掉），可后果是删到最后一个画布时，云端那份
 * 备份会一直留着已删除的画布 —— 用户删掉的画布并没有真的离开云端。
 * 删除是明确的用户动作，此时推空列表是准确的，所以这条路径绕过那个守卫。
 */
export async function pushProjectsBackup(projects: unknown[]): Promise<void> {
    try {
        await fetch("/canvas/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ type: "projects", data: projects }),
        });
    } catch {
        /* 静默失败，下次同步重试 */
    }
}
