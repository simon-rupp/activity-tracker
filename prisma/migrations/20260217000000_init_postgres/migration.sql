-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Exercise" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LiftSession" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiftSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "public"."RunSession" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "distanceHundredths" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "public"."Exercise"("name");

-- CreateIndex
CREATE INDEX "LiftSession_date_idx" ON "public"."LiftSession"("date");

-- CreateIndex
CREATE INDEX "LiftEntry_liftSessionId_order_idx" ON "public"."LiftEntry"("liftSessionId", "order");

-- CreateIndex
CREATE INDEX "RunSession_date_idx" ON "public"."RunSession"("date");

-- AddForeignKey
ALTER TABLE "public"."LiftEntry" ADD CONSTRAINT "LiftEntry_liftSessionId_fkey" FOREIGN KEY ("liftSessionId") REFERENCES "public"."LiftSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LiftEntry" ADD CONSTRAINT "LiftEntry_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "public"."Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

