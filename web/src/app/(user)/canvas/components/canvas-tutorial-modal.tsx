"use client";

import { Button, Modal } from "antd";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";

export function CanvasTutorialModal({
    open,
    onClose,
    onOpenAgent,
    onCreateWorkflow,
    onOpenAssets,
}: {
    open: boolean;
    onClose: () => void;
    onOpenAgent: () => void;
    onCreateWorkflow: () => void;
    onOpenAssets: () => void;
}) {
    const colorTheme = useThemeStore((state) => state.theme);
    const theme = canvasThemes[colorTheme];
    const steps = [
        ["1", "输入片段", "粘贴剧本、片段描述，或直接上传一张参考图。"],
        ["2", "让 Agent 拆流程", "输入“帮我拆成视觉生产流程”，系统会创建策划、角色、三视图、场景、分镜、关键帧等卡片。"],
        ["3", "确定角色来源", "角色可以新生成、使用我的资产，后续也可以接平台租赁角色。不要默认每次都重做人物。"],
        ["4", "逐张确认生成", "先确认提示词、模型、比例和画质，再生成角色、场景、关键帧和视频。"],
        ["5", "回流资产库", "满意的人设、三视图、场景、风格、分镜模板和视频都可以存入素材库，下个项目直接复用。"],
    ];
    const faqs = [
        ["我只有一段片段，不是完整剧本怎么办？", "直接把片段贴给 Agent，它会按短片段流程走，不会强行生成完整大纲。"],
        ["为什么要三视图？", "三视图是角色一致性的锚点，可以明显降低换脸、换服装和角色漂移。"],
        ["我的素材怎么复用？", "点击“我的素材”插入画布，节点会保留素材 ID、来源和授权信息。"],
        ["生成失败怎么办？", "先看节点错误提示，调整提示词、模型或参考图后重试；公测阶段建议少量多次生成。"],
    ];

    return (
        <Modal open={open} onCancel={onClose} footer={null} centered width={920} title={null} destroyOnHidden>
            <div className="space-y-6 py-1 text-stone-900 dark:text-stone-100">
                <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between" style={{ borderColor: theme.node.stroke }}>
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">SceneFlow Quick Start</div>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight">5 分钟跑通第一个视觉片段</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500 dark:text-stone-400">推荐从一个 10-20 秒片段开始，例如“竹林雨夜，两名武侠角色交手”。先搭流程，再逐步生成，最后把可复用资产沉淀到素材库。</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <Button type="primary" onClick={onOpenAgent}>
                            打开 Agent
                        </Button>
                        <Button onClick={onCreateWorkflow}>创建示例流程</Button>
                        <Button onClick={onOpenAssets}>我的素材</Button>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-5">
                    {steps.map(([index, title, desc]) => (
                        <div key={index} className="rounded-lg border bg-white p-3 shadow-sm dark:bg-stone-950" style={{ borderColor: theme.node.stroke }}>
                            <div className="flex size-7 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white dark:bg-stone-100 dark:text-stone-950">{index}</div>
                            <div className="mt-3 text-sm font-semibold">{title}</div>
                            <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-stone-400">{desc}</p>
                        </div>
                    ))}
                </div>

                <div className="grid gap-4 md:grid-cols-[1.05fr_.95fr]">
                    <div className="rounded-lg border p-4" style={{ borderColor: theme.node.stroke }}>
                        <div className="text-sm font-semibold">推荐对 Agent 说</div>
                        <div className="mt-3 rounded-lg bg-stone-100 p-3 text-sm leading-6 text-stone-700 dark:bg-stone-900 dark:text-stone-200">帮我把这个片段拆成视觉生产流程：东方不败和风清扬在竹林雨夜交手，15 秒，武侠孤独感，重点做角色、三视图、场景、分镜、关键帧和视频。</div>
                        <div className="mt-3 text-xs leading-5 text-stone-500 dark:text-stone-400">如果你已经有剧本或图片，直接粘贴文本或上传参考图，再让 Agent 判断下一步。</div>
                    </div>
                    <div className="rounded-lg border p-4" style={{ borderColor: theme.node.stroke }}>
                        <div className="text-sm font-semibold">角色来源怎么选</div>
                        <div className="mt-3 grid gap-2 text-xs leading-5 text-stone-500 dark:text-stone-400">
                            <div>
                                <span className="font-medium text-stone-800 dark:text-stone-200">新生成：</span>适合没有固定角色、想快速试风格。
                            </div>
                            <div>
                                <span className="font-medium text-stone-800 dark:text-stone-200">我的资产：</span>适合已有角色设定、三视图或品牌形象。
                            </div>
                            <div>
                                <span className="font-medium text-stone-800 dark:text-stone-200">平台租赁：</span>后续用于租用训练好的虚拟人物，公测阶段先预留链路。
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border p-4" style={{ borderColor: theme.node.stroke }}>
                    <div className="text-sm font-semibold">常见问题</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {faqs.map(([question, answer]) => (
                            <div key={question} className="rounded-md bg-stone-100 p-3 dark:bg-stone-900">
                                <div className="text-xs font-semibold">{question}</div>
                                <div className="mt-1 text-xs leading-5 text-stone-500 dark:text-stone-400">{answer}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
