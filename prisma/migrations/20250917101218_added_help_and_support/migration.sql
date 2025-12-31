-- CreateTable
CREATE TABLE "help_and_supports" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "full_name" TEXT,
    "email" TEXT,
    "subject" TEXT,
    "message" TEXT,
    "status" TEXT DEFAULT 'solved',
    "user_id" TEXT,

    CONSTRAINT "help_and_supports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "help_and_supports" ADD CONSTRAINT "help_and_supports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
