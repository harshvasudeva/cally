-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "negotiationNote" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "originalTime" DATETIME;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "discordBotToken" TEXT;
ALTER TABLE "Settings" ADD COLUMN "discordClientId" TEXT;
