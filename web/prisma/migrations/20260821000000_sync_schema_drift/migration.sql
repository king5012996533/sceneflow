-- 对齐 schema 与迁移历史的漂移（GenerationJob.resultUrl / Order.billingCycle 默认值）
-- 生产库此前经 db push 已存在这些变更；使用幂等语法，保证「已有列」和「全新环境」两条路径都能 migrate deploy。
-- AlterTable
ALTER TABLE "GenerationJob" ADD COLUMN IF NOT EXISTS "resultUrl" TEXT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "billingCycle" SET DEFAULT 'manual';
