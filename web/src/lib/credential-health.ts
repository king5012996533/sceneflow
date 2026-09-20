/**
 * 渠道健康（熔断）——纯逻辑，不碰数据库，单测直接跑。
 *
 * 要解决的问题：平台凭证失效时（上游 401/403），用户看到的是「模型鉴权失败，请检查 Base URL、
 * API Key、模型名」，而这是写给管理员的话 —— 终端用户既看不到也改不了那把钥匙，只会反复撞墙
 * （线上真实例子：Replicate token 被吊销，同一个人两次尝试都只拿到一句 502）。
 *
 * 口径：
 * - **只有 401/403 算「凭证类」失败**。400（参数/内容审核）、429（限流）、5xx（上游波动）都不算，
 *   把它们算进来会让一次内容审核失败就把渠道熔断掉。
 * - 连击到阈值才开窗（避免一次抖动就掐掉渠道）；成功一次立刻清零（真实流量即探针）。
 * - 窗口到期自动半开：不写"永久熔断"，否则换好钥匙还得人工记得来解锁。
 */

/** 连续几次凭证类失败才熔断。 */
export const CREDENTIAL_FAILURE_THRESHOLD = 3;

/** 熔断窗口长度（毫秒）：窗口内不参与解析，到点自动半开重试。 */
export const CREDENTIAL_CIRCUIT_WINDOW_MS = 30 * 60 * 1000;

export type CredentialHealthRow = {
    healthFailStreak?: number | null;
    healthLastStatus?: number | null;
    healthLastFailureAt?: Date | null;
    healthLastSuccessAt?: Date | null;
    healthDownUntil?: Date | null;
    healthNote?: string | null;
};

export type CredentialHealthPatch = {
    healthFailStreak: number;
    healthLastStatus?: number | null;
    healthLastFailureAt?: Date | null;
    healthLastSuccessAt?: Date | null;
    healthDownUntil: Date | null;
    healthNote: string | null;
};

/** 这次失败是不是「钥匙的问题」——只有鉴权类状态码算。 */
export function isCredentialAuthStatus(status: number): boolean {
    return status === 401 || status === 403;
}

/** 熔断窗口是否还没到期（未到期 = 该凭证不参与解析）。 */
export function isCredentialCircuitOpen(row: CredentialHealthRow, now: Date = new Date()): boolean {
    const until = row.healthDownUntil;
    return Boolean(until && until.getTime() > now.getTime());
}

/**
 * 记一次凭证类失败后该写成什么；`tripped` 表示「这一次刚好把闸拉下来」（用于去重告警）。
 *
 * 已经在窗口内的凭证不会再被解析，所以正常情况下不会重复触发告警；
 * 窗口到期后半开重试再失败，会重新触发一次 —— 即每个坏渠道最多每窗口一封告警邮件。
 */
export function nextHealthAfterFailure(row: CredentialHealthRow, status: number, now: Date = new Date()): CredentialHealthPatch & { tripped: boolean } {
    const streak = (row.healthFailStreak ?? 0) + 1;
    const tripped = streak >= CREDENTIAL_FAILURE_THRESHOLD && !isCredentialCircuitOpen(row, now);
    const downUntil = tripped ? new Date(now.getTime() + CREDENTIAL_CIRCUIT_WINDOW_MS) : (row.healthDownUntil ?? null);
    return {
        healthFailStreak: streak,
        healthLastStatus: status,
        healthLastFailureAt: now,
        healthDownUntil: downUntil,
        healthNote: tripped ? `连续 ${streak} 次凭证类失败（HTTP ${status}），已暂停该渠道至 ${formatClock(downUntil!)}，到期自动重试` : (row.healthNote ?? null),
        tripped,
    };
}

/** 成功一次：连击清零、熔断解除（真实流量即探针）。 */
export function nextHealthAfterSuccess(row: CredentialHealthRow, now: Date = new Date()): CredentialHealthPatch {
    void row;
    return {
        healthFailStreak: 0,
        healthLastStatus: null,
        healthLastFailureAt: null,
        healthLastSuccessAt: now,
        healthDownUntil: null,
        healthNote: null,
    };
}

/**
 * 管理员手动解除熔断（后台「立即重试」）。
 *
 * 与 nextHealthAfterSuccess 的区别：这**不是**一次成功，不能把「最近一次成功」写成现在 ——
 * 否则后台会显示「正常 · 最近一次成功 15:04」，而钥匙其实还是坏的。所以只清熔断与连击，
 * 留一句说明，等下一次真实调用裁决（成功走 recordSuccess 清零，失败重新累积）。
 */
export function manualHealthResetPatch(): CredentialHealthPatch {
    return {
        healthFailStreak: 0,
        healthLastStatus: null,
        healthLastFailureAt: null,
        healthLastSuccessAt: null,
        healthDownUntil: null,
        healthNote: "管理员已手动解除熔断，等待下一次调用验证",
    };
}

export type CredentialHealthView = {
    state: "ok" | "failing" | "down";
    /** 后台列表用的一行字 */
    label: string;
    /** 详情（失败次数、状态码、到期时间） */
    detail: string;
};

/** 后台展示用：把健康字段翻成人话。 */
export function describeCredentialHealth(row: CredentialHealthRow, now: Date = new Date()): CredentialHealthView {
    if (isCredentialCircuitOpen(row, now)) {
        return {
            state: "down",
            label: "已熔断",
            detail: row.healthNote || `凭证类失败已暂停该渠道至 ${formatClock(row.healthDownUntil!)}`,
        };
    }
    const streak = row.healthFailStreak ?? 0;
    if (streak > 0) {
        // 连击没清零但窗口已过期 = 半开状态：下一次失败会立刻再拉闸（streak 已过阈值），
        // 所以这里不能说「连续 3 次将暂停」——那件事已经发生过了。
        const atThreshold = streak >= CREDENTIAL_FAILURE_THRESHOLD;
        return {
            state: "failing",
            label: `失败 ${streak} 次`,
            detail: `最近一次凭证类失败：HTTP ${row.healthLastStatus ?? "?"}${row.healthLastFailureAt ? `（${formatClock(row.healthLastFailureAt)}）` : ""}；${atThreshold ? "熔断窗口已到期，下一次失败会立即再次暂停该渠道" : `连续 ${CREDENTIAL_FAILURE_THRESHOLD} 次将暂停该渠道`}`,
        };
    }
    return {
        state: "ok",
        label: "正常",
        detail: row.healthNote || (row.healthLastSuccessAt ? `最近一次成功：${formatClock(row.healthLastSuccessAt)}` : "尚无调用记录"),
    };
}

/** 渠道不可用时给终端用户看的提示（面向用户，不要叫他们去查 Base URL / API Key）。 */
export function channelMaintenanceMessage(model?: string | null): string {
    const who = model ? `模型「${model}」所在渠道` : "该模型所在渠道";
    return `${who}正在维护（上游凭证失效），已通知管理员，请稍后重试或先换用其它模型。`;
}

/** 模型选择器里给不可用选项打的角标（唯一来源，界面与单测共用） */
export const CHANNEL_DOWN_TAG = "渠道维护中";

/**
 * 模型目录的可用性：某个模型只要还有**一张没熔断的凭证**认领它，就仍然可用。
 *
 * 熔断掐掉的是那张凭证，不是这个模型 —— 同模型配了备份渠道时不该把用户拦住。
 * 只有「认领这个模型的凭证全在熔断窗口里」才判不可用（这时服务端解析也必然落空）。
 *
 * 收在这里而不是写在路由里：目录接口与端到端核对要用同一条规则，两处各写一遍必然漂移。
 */
export function computeModelAvailability(
    credentials: Array<{ name?: string | null; models?: string[] | null } & CredentialHealthRow>,
    now: Date = new Date(),
): Map<string, { available: boolean; downNames: string[] }> {
    const usable = new Set<string>();
    const down = new Map<string, string[]>();
    for (const credential of credentials) {
        const open = isCredentialCircuitOpen(credential, now);
        for (const raw of credential.models ?? []) {
            const model = String(raw).trim();
            if (!model) continue;
            if (!open) {
                usable.add(model);
                continue;
            }
            const names = down.get(model) ?? [];
            names.push(credential.name || "未命名渠道");
            down.set(model, names);
        }
    }
    const result = new Map<string, { available: boolean; downNames: string[] }>();
    for (const [model, downNames] of down) {
        result.set(model, { available: usable.has(model), downNames });
    }
    for (const model of usable) {
        if (!result.has(model)) result.set(model, { available: true, downNames: [] });
    }
    return result;
}

function formatClock(value: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
