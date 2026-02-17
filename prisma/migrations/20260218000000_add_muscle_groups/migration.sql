-- CreateTable
CREATE TABLE "MuscleGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MuscleGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiftEntryMuscleGroup" (
    "liftEntryId" INTEGER NOT NULL,
    "muscleGroupId" INTEGER NOT NULL,

    CONSTRAINT "LiftEntryMuscleGroup_pkey" PRIMARY KEY ("liftEntryId","muscleGroupId")
);

-- CreateIndex
CREATE UNIQUE INDEX "MuscleGroup_name_key" ON "MuscleGroup"("name");

-- CreateIndex
CREATE INDEX "LiftEntryMuscleGroup_muscleGroupId_idx" ON "LiftEntryMuscleGroup"("muscleGroupId");

-- AddForeignKey
ALTER TABLE "LiftEntryMuscleGroup" ADD CONSTRAINT "LiftEntryMuscleGroup_liftEntryId_fkey" FOREIGN KEY ("liftEntryId") REFERENCES "LiftEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiftEntryMuscleGroup" ADD CONSTRAINT "LiftEntryMuscleGroup_muscleGroupId_fkey" FOREIGN KEY ("muscleGroupId") REFERENCES "MuscleGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
