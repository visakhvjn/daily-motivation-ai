-- CreateTable
CREATE TABLE "DailyContent" (
    "id" TEXT NOT NULL,
    "localDateKey" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "imageSourceUrl" TEXT NOT NULL,
    "imageCompositedUrl" TEXT NOT NULL,
    "unsplashAuthorName" TEXT,
    "unsplashAuthorUrl" TEXT,
    "emailsSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verificationTokenHash" TEXT,
    "verificationSentAt" TIMESTAMP(3),
    "unsubscribeToken" TEXT NOT NULL,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSend" (
    "id" TEXT NOT NULL,
    "dailyContentId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "resendEmailId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "firstOpenedAt" TIMESTAMP(3),
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "bouncedAt" TIMESTAMP(3),
    "complainedAt" TIMESTAMP(3),

    CONSTRAINT "EmailSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyContent_localDateKey_key" ON "DailyContent"("localDateKey");

-- CreateIndex
CREATE INDEX "DailyContent_localDateKey_idx" ON "DailyContent"("localDateKey");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_unsubscribeToken_key" ON "Subscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "Subscriber_verifiedAt_unsubscribedAt_idx" ON "Subscriber"("verifiedAt", "unsubscribedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSend_resendEmailId_key" ON "EmailSend"("resendEmailId");

-- CreateIndex
CREATE INDEX "EmailSend_dailyContentId_idx" ON "EmailSend"("dailyContentId");

-- CreateIndex
CREATE INDEX "EmailSend_subscriberId_idx" ON "EmailSend"("subscriberId");

-- AddForeignKey
ALTER TABLE "EmailSend" ADD CONSTRAINT "EmailSend_dailyContentId_fkey" FOREIGN KEY ("dailyContentId") REFERENCES "DailyContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSend" ADD CONSTRAINT "EmailSend_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
