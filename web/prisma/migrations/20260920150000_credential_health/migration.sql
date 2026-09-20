-- 渠道健康（熔断）：让「凭证失效」这类故障自己现形，而不是让用户反复撞墙。
--
-- 只在凭证类失败（401/403）时累积 healthFailStreak；连到阈值就把 healthDownUntil 推到未来，
-- 窗口内该凭证不参与 resolvePlatformCredential 的解析（流量落到同模型的下一个凭证，或快速失败并给出可行动提示）。
-- 窗口到期自动半开重试：真实流量即探针，成功清空、再失败再开窗，不需要人工清理。
ALTER TABLE "ProviderCredential" ADD COLUMN IF NOT EXISTS "healthFailStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProviderCredential" ADD COLUMN IF NOT EXISTS "healthLastStatus" INTEGER;
ALTER TABLE "ProviderCredential" ADD COLUMN IF NOT EXISTS "healthLastFailureAt" TIMESTAMP(3);
ALTER TABLE "ProviderCredential" ADD COLUMN IF NOT EXISTS "healthLastSuccessAt" TIMESTAMP(3);
ALTER TABLE "ProviderCredential" ADD COLUMN IF NOT EXISTS "healthDownUntil" TIMESTAMP(3);
ALTER TABLE "ProviderCredential" ADD COLUMN IF NOT EXISTS "healthNote" TEXT;

CREATE INDEX IF NOT EXISTS "ProviderCredential_enabled_healthDownUntil_idx" ON "ProviderCredential" ("enabled", "healthDownUntil");
