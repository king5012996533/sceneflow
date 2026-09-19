import type { ReferenceImage } from "@/types/image";

/**
 * 图片编号词汇的**唯一出处**：`@图片 N`（N 从 1 起）。
 * 下一行的模板与这一行的正则是同一套词汇的两种写法，改词汇请一起改（交互编辑的标记体检
 * 用正则从提示词里回读编号，两者对不上就会把好提示词判成「标记没编号」）。
 */
export const IMAGE_REFERENCE_TOKEN_SOURCE = String.raw`@图片\s*(\d+)`;

export function imageReferenceLabel(index: number) {
    return `@图片 ${index + 1}`;
}

export function buildImageReferencePromptText(prompt: string, references: ReferenceImage[]) {
    const text = prompt.trim();
    if (!references.length) return text;
    const labels = references.map((_, index) => imageReferenceLabel(index));
    return `参考图片编号：${labels.join("、")}。请按这些编号理解提示词中的图片引用。\n\n${text}`;
}
