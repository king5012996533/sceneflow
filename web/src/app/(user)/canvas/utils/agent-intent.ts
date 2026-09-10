/**
 * 画布 Agent 的意图判定。
 *
 * 这些正则决定「这一轮要不要给模型工具、要不要强制调用工具、要不要先读画布」。
 * 从 runner 里抽出来单独成模块，便于与注册表一起被视为 Agent 的策略层，
 * 而不是散落在某个 hook 的尾部。
 */

export const CANVAS_TOOL_INTENT_PATTERN =
    /(创建|新建|放到画布|落到画布|生成节点|创建卡片|连线|连接|读取画布|当前画布|看一下画布|选中|删除|移动|调整节点|修改节点|执行|运行|重跑|重新生成|续写|尾帧|帮我操作|改画布|更新节点|开始生成|立即生成|生成图片|生成视频|生成音频|图生视频|帮我生成|生成一张|生成一段|出一张|做一张|画一张|反推|倒推|提取提示词|生成提示词|参考图)/;

export const CHAT_ONLY_INTENT_PATTERN = /(想法|建议|规划|剧本|剧情|片段|分镜|怎么看|帮我看|分析|优化|怎么做|怎么开始|聊|在吗|你好|谢谢|难用|不会|卡住)/;

/** 是否向模型暴露画布工具：纯聊天意图（且不含动作意图）时不给工具 */
export function shouldExposeCanvasTools(text: unknown) {
    if (typeof text !== "string") return false;
    const value = text.trim();
    if (!value) return false;
    if (CHAT_ONLY_INTENT_PATTERN.test(value) && !CANVAS_TOOL_INTENT_PATTERN.test(value)) return false;
    return true;
}

/** 是否强制模型调用工具：用户明确要求改动画布时不允许只回文本 */
export function shouldRequireToolCall(text: string) {
    return /(创建|新建|放到画布|落到画布|生成节点|执行|运行|重跑|重新生成|立即生成|删除|移动|修改|更新|连线|连接|开始|生成图片|生成视频|生成音频|图生视频|续写|尾帧|读取画布|当前画布|操作画布|整理成工作流|帮我生成|生成一张|生成一段|出一张|做一张|画一张|反推|倒推|提取提示词|生成提示词)/.test(
        text,
    );
}

/** 写操作前是否必须先读画布：涉及已有节点、选区或参考关系时先看再改 */
export function shouldReadCanvasBeforeWrite(text: string) {
    return /(这个|这张|当前|选中|基于|参考|参考图|图片|连接|连线|删除|修改|更新|移动|重跑|重新生成|续写|尾帧|图生视频|工作流|流程|已有|上一个|下一个|反推|倒推|提取提示词)/.test(text);
}
