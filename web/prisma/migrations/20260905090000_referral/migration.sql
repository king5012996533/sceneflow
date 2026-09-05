-- 老带新邀请返利：邀请码 + 归属关系（注册时一次性绑定，不可改）
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN "referredById" TEXT;
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
