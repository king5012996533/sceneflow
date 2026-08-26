-- Prevent duplicate referenced credit transactions (purchase, refund, daily grant).
CREATE UNIQUE INDEX IF NOT EXISTS "CreditTransaction_userId_type_refType_refId_key"
ON "CreditTransaction" ("userId", "type", "refType", "refId");
