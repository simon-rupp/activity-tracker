ALTER TABLE "public"."User"
ADD COLUMN "googleSubject" TEXT;

CREATE UNIQUE INDEX "User_googleSubject_key" ON "public"."User"("googleSubject");
