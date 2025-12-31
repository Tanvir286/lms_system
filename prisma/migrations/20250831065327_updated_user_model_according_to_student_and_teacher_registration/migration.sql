-- AlterTable
ALTER TABLE "users" ADD COLUMN     "about_me" TEXT,
ADD COLUMN     "certifications" TEXT,
ADD COLUMN     "general_availability" TEXT,
ADD COLUMN     "grade_level" TEXT,
ADD COLUMN     "highest_education_level" TEXT,
ADD COLUMN     "hourly_rate" DECIMAL(10,2),
ADD COLUMN     "is_agree_application_process" INTEGER DEFAULT 0,
ADD COLUMN     "is_agreed_terms" INTEGER DEFAULT 0,
ADD COLUMN     "is_verified" INTEGER DEFAULT 0,
ADD COLUMN     "subjects_taught" TEXT[],
ADD COLUMN     "teching_experience" TEXT;
