/**
 * 生成任务的积分退款政策（纯逻辑：不连库、不触网、无依赖，可直接单测）。
 *
 * 规则（2026-09-20 老板口径，覆盖 2026-09-19 那版「一律不退」）：
 *   用户没拿到成品，就不该扣钱。失败、超时被清扫、用户自己取消，只要成品没进我们的归档，
 *   预扣的积分一律退回。唯一不退的例外是「成品已经归档在我们手上」（生成记录里能取到）——
 *   那一次钱换到了东西。
 *
 * 为什么把 09-19 那版改回来：
 *   09-19 的道理是「上游按这一次尝试收过我们钱了」，可线上真有整类任务上游**压根没受理**：
 *   建单就被参数校验 400 掉（例：GenVideo 渠道的 2.5 模式上游当时没开）、请求根本没发出去
 *   （本地预检就拦了，例如 GenVideo 不收参考视频/音频）。这类失败上游一分钱没收到，
 *   我们却照收 60 积分——用户看到的只是一句失败提示，钱却没了；同一条提示按两次就是两份钱。
 *
 * 退款幂等（credit-ledger 按「任务 + refund」去重），政策来回改不会重复退。
 * 只管生成任务的积分扣退；订单（支付通道）的退款不走这里。
 */

/** 生成失败/取消是否退还预扣积分。2026-09-20 起为 true（成品已归档的那一次除外，见下）。 */
export const GENERATION_REFUNDS_ENABLED = true;

/**
 * 这次结算要不要把预扣的积分退回去。
 *
 * @param status 任务最终状态；成功从来不退（预扣即实收）
 * @param hasArtifact 成品是否已经归档在我们手上（resultData 里有 archiveKey）。
 *                    有 = 用户能取到成品，这一次不退；没有 = 什么都没换到，退。
 */
export function shouldRefundGeneration(status: "succeeded" | "failed" | "cancelled", hasArtifact = false): boolean {
    if (status === "succeeded") return false;
    if (hasArtifact) return false;
    return GENERATION_REFUNDS_ENABLED;
}
