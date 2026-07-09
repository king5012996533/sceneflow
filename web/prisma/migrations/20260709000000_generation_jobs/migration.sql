CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,
    "metadata" JSONB,
    "quotaRefunded" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GenerationJob_requestKey_key" ON "GenerationJob"("requestKey");
CREATE INDEX "GenerationJob_userId_status_idx" ON "GenerationJob"("userId", "status");
CREATE INDEX "GenerationJob_userId_createdAt_idx" ON "GenerationJob"("userId", "createdAt");

ALTER TABLE "GenerationJob"
ADD CONSTRAINT "GenerationJob_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
