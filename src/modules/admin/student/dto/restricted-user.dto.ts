import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Restriction_period } from '@prisma/client';

export class RestrictedUserDto {
  @IsEnum(Restriction_period, { message: 'Invalid restriction period' })
  restriction_period?: Restriction_period;

  @IsString()
  @IsNotEmpty()
  restriction_reason?: string;
}
