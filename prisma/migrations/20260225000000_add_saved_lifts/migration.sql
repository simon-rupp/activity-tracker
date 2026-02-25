CREATE TABLE "public"."SavedLift" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "liftSessionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedLift_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedLift_userId_liftSessionId_key" ON "public"."SavedLift"("userId", "liftSessionId");
CREATE INDEX "SavedLift_userId_createdAt_idx" ON "public"."SavedLift"("userId", "createdAt");
CREATE INDEX "SavedLift_liftSessionId_idx" ON "public"."SavedLift"("liftSessionId");

ALTER TABLE "public"."SavedLift"
ADD CONSTRAINT "SavedLift_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."SavedLift"
ADD CONSTRAINT "SavedLift_liftSessionId_fkey"
FOREIGN KEY ("liftSessionId") REFERENCES "public"."LiftSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
