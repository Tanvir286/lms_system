import { IsString, IsDate, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class CreateStudentDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  subject: string;

  @IsDate()
  @Type(() => Date)
  slots: Date;
}