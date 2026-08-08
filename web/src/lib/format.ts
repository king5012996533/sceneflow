/**
 * 金额格式化：价格以「分」存储，这里统一转为「元」展示。
 * 最多保留两位小数（如 990 分 → ¥9.9），整数价格不带多余小数位。
 */
export function formatCny(amount: number) {
    return `¥${(amount / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}
