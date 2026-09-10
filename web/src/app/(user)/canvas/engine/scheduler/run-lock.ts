/**
 * 画布单写者锁。
 *
 * 一次生产运行的每个阶段都会往同一块画布上写节点。如果两个运行同时写，
 * 结果不是「更快」，而是互相引用到半成品：在线对话的 Agent 刚建好的节点
 * 可能被生产流程的清理逻辑算进上游产出，反之亦然。
 *
 * 所以画布同一时刻只允许一个运行写入。锁的粒度刻意选在「运行」而不是「单次写」：
 * 单次写的间隙（模型思考、图像生成中）正是另一个运行插进来搅局的时候。
 *
 * 不做重入：即使 id 相同也拒绝。续跑（暂停后继续、确认后接着跑）都发生在
 * 上一次运行已经结束、锁已释放之后，所以不需要重入；而允许同 id 重入，
 * 就等于允许同一个运行被启动两次（例如面板重挂载后用户再点「继续」），
 * 那正是这把锁要防的事。
 *
 * 说明：这是同一标签页内的模块级单例锁，够用且不引入跨页/跨设备的复杂度
 * （同一块画布的编辑本来就发生在同一个页面标签里）。
 *
 * 边界：锁约束的是「Agent 运行之间」的并发写入（在线对话 / 本地 Agent / 全自动生产）。
 * 用户手动拖拽、改属性、点一下模板自己往画布上写，不受锁限制——用户是画布的主人，
 * 不该被一个后台运行挡住手。
 */

export type CanvasRunKind = "online" | "local" | "orchestrator";

export type CanvasRunOwner = {
    id: string;
    kind: CanvasRunKind;
    label: string;
    startedAt: number;
};

const RUN_KIND_LABELS: Record<CanvasRunKind, string> = {
    online: "在线对话",
    local: "本地 Agent",
    orchestrator: "全自动生产",
};

let owner: CanvasRunOwner | null = null;

export function canvasRunOwner(): CanvasRunOwner | null {
    return owner ? { ...owner } : null;
}

export function describeCanvasRunOwner(current: CanvasRunOwner): string {
    const seconds = Math.max(0, Math.round((Date.now() - current.startedAt) / 1000));
    return `${RUN_KIND_LABELS[current.kind]}（${current.label}，已运行 ${seconds} 秒）`;
}

/**
 * 尝试取得画布写入权。已经有主就拒绝（含同一个运行自己——重复启动等于并发写）。
 * 成功时返回的 release 只能由取得者调用；重复调用是安全的空操作。
 */
export function tryClaimCanvasRun(request: { id: string; kind: CanvasRunKind; label: string }): { ok: true; release: () => void } | { ok: false; reason: string; owner: CanvasRunOwner } {
    if (owner) {
        const self = owner.id === request.id;
        return {
            ok: false,
            reason: self ? `这个运行已经在跑了（${describeCanvasRunOwner(owner)}），不要重复启动。` : `画布正被「${describeCanvasRunOwner(owner)}」占用，请等它结束后再开始。`,
            owner: canvasRunOwner()!,
        };
    }
    owner = { ...request, startedAt: Date.now() };
    let released = false;
    return {
        ok: true,
        release: () => {
            if (released) return;
            released = true;
            if (owner?.id === request.id) owner = null;
        },
    };
}

/** 测试与「放弃运行」用：无条件清空占用 */
export function forceReleaseCanvasRun(): void {
    owner = null;
}
