-- CreateTable
CREATE TABLE "Exercise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LiftSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LiftEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "liftSessionId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightTenths" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "LiftEntry_liftSessionId_fkey" FOREIGN KEY ("liftSessionId") REFERENCES "LiftSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiftEntry_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RunSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "distanceHundredths" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

-- CreateIndex
CREATE INDEX "LiftSession_date_idx" ON "LiftSession"("date");

-- CreateIndex
CREATE INDEX "LiftEntry_liftSessionId_order_idx" ON "LiftEntry"("liftSessionId", "order");

-- CreateIndex
CREATE INDEX "RunSession_date_idx" ON "RunSession"("date");
