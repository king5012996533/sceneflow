-- 套餐系统下线（纯积分制重构）：删除 Plan / Entitlement / Subscription，
-- Order 表移除 planId 列（积分包订单不受影响）。
-- 顺序：先删引用 Plan 的表 → 删 Order.planId 列 → 最后删 Plan。
-- DROP COLUMN 会自动带走对应外键约束与索引。

DROP TABLE IF EXISTS "Subscription";
DROP TABLE IF EXISTS "Entitlement";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "planId";
DROP TABLE IF EXISTS "Plan";
