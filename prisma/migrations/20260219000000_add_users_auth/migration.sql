-- This migration intentionally recreates workout tables to attach all data to users.
-- Existing data is discarded by design.

DROP TABLE IF EXISTS "public"."LiftEntryMuscleGroup" CASCADE;
DROP TABLE IF EXISTS "public"."LiftEntry" CASCADE;
DROP TABLE IF EXISTS "public"."LiftSession" CASCADE;
DROP TABLE IF EXISTS "public"."RunSession" CASCADE;
DROP TABLE IF EXISTS "public"."Exercise" CASCADE;
DROP TABLE IF EXISTS "public"."MuscleGroup" CASCADE;
DROP TABLE IF EXISTS "public"."EmailVerificationToken" CASCADE;
DROP TABLE IF EXISTS "public"."PasswordResetToken" CASCADE;
DROP TABLE IF EXISTS "public"."User" CASCADE;

CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."Exercise" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MuscleGroup" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MuscleGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."LiftSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiftSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."LiftEntry" (
    "id" SERIAL NOT NULL,
    "liftSessionId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightTenths" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "LiftEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."LiftEntryMuscleGroup" (
    "liftEntryId" INTEGER NOT NULL,
    "muscleGroupId" INTEGER NOT NULL,

    CONSTRAINT "LiftEntryMuscleGroup_pkey" PRIMARY KEY ("liftEntryId","muscleGroupId")
);

CREATE TABLE "public"."RunSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "distanceHundredths" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."EmailVerificationToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");
CREATE UNIQUE INDEX "Exercise_userId_name_key" ON "public"."Exercise"("userId", "name");
CREATE INDEX "Exercise_userId_idx" ON "public"."Exercise"("userId");
CREATE UNIQUE INDEX "MuscleGroup_userId_name_key" ON "public"."MuscleGroup"("userId", "name");
CREATE INDEX "MuscleGroup_userId_idx" ON "public"."MuscleGroup"("userId");
CREATE INDEX "LiftSession_userId_date_idx" ON "public"."LiftSession"("userId", "date");
CREATE INDEX "LiftEntry_liftSessionId_order_idx" ON "public"."LiftEntry"("liftSessionId", "order");
CREATE INDEX "LiftEntryMuscleGroup_muscleGroupId_idx" ON "public"."LiftEntryMuscleGroup"("muscleGroupId");
CREATE INDEX "RunSession_userId_date_idx" ON "public"."RunSession"("userId", "date");
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "public"."EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_idx" ON "public"."EmailVerificationToken"("userId");
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "public"."EmailVerificationToken"("expiresAt");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "public"."PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "public"."PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "public"."PasswordResetToken"("expiresAt");

ALTER TABLE "public"."Exercise" ADD CONSTRAINT "Exercise_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MuscleGroup" ADD CONSTRAINT "MuscleGroup_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."LiftSession" ADD CONSTRAINT "LiftSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."LiftEntry" ADD CONSTRAINT "LiftEntry_liftSessionId_fkey"
  FOREIGN KEY ("liftSessionId") REFERENCES "public"."LiftSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."LiftEntry" ADD CONSTRAINT "LiftEntry_exerciseId_fkey"
  FOREIGN KEY ("exerciseId") REFERENCES "public"."Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."LiftEntryMuscleGroup" ADD CONSTRAINT "LiftEntryMuscleGroup_liftEntryId_fkey"
  FOREIGN KEY ("liftEntryId") REFERENCES "public"."LiftEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."LiftEntryMuscleGroup" ADD CONSTRAINT "LiftEntryMuscleGroup_muscleGroupId_fkey"
  FOREIGN KEY ("muscleGroupId") REFERENCES "public"."MuscleGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."RunSession" ADD CONSTRAINT "RunSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
