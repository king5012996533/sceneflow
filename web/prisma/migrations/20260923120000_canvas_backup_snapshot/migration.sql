-- 云端备份历史快照（2026-09-23）
-- 备份是整份覆盖式写入：本机库为空/过旧的设备一开画布页就会把云端覆盖成它本地的样子。
-- 现在每次「内容真的变了」的覆盖都先留一份上一版。
ALTER TABLE "CanvasBackup" ADD COLUMN IF NOT EXISTS "signature" TEXT;

CREATE TABLE IF NOT EXISTS "CanvasBackupSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "version" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanvasBackupSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CanvasBackupSnapshot_userId_type_createdAt_idx" ON "CanvasBackupSnapshot"("userId", "type", "createdAt");
