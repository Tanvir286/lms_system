
import { Mode } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsArray, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSessionDto {

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

  @IsOptional()
  @IsArray()
  @IsDate({ each: true })
  @Type(() => Date)
  available_slots_time_and_date?: Date[];

  @IsOptional()
  @IsDate()
  deleted_at?: Date;
}
