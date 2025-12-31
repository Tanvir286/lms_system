// dto/restrict-user.dto.ts
import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { Restriction_period } from "@prisma/client";

export class RestrictUserDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsEnum(Restriction_period, {
    message: "period must be a valid RestrictionPeriod enum value",
  })
  period: Restriction_period;
}
