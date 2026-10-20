-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "counterVersion" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "completedReps" INTEGER NOT NULL,
    "interrupted" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workout_sessions_userId_clientId_key" ON "workout_sessions"("userId", "clientId");

-- CreateIndex
CREATE INDEX "workout_sessions_userId_startedAt_id_idx" ON "workout_sessions"("userId", "startedAt", "id");

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
