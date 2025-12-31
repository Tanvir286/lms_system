/*
  Warnings:

  - The `restriction_period` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Restriction_period" AS ENUM ('One_Week', 'Two_Weeks', 'One_Month', 'Three_Months', 'Six_Months', 'One_Year', 'Permanent');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "restriction_period",
ADD COLUMN     "restriction_period" "Restriction_period" DEFAULT 'Three_Months';
