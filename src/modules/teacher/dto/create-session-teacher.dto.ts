// create-session.dto.ts
import { Mode } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsArray, IsDate, IsEnum } from 'class-validator';
  // Assuming you have this Enum defined for session modes

export class CreateSessionDto {

  @IsOptional()
  @IsString()
  user_id: string;

  @IsOptional()
  @IsString()
  session_type?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  session_charge?: string;

  @IsOptional()
  @IsEnum(Mode)
  mode?: Mode;  

  @IsOptional()
  @IsString()
  join_link?: string;

  @IsArray()
  @IsDate({ each: true })
  @Type(() => Date)
  available_slots_time_and_date: Date[];

  @IsOptional()
  @IsDate()
  deleted_at?: Date;

  @IsOptional()
  @IsString()
  slots_available?: string;
}
