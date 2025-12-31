import { IsNumber, IsOptional, IsString } from 'class-validator';

export class StudentRatingDto {
  @IsNumber()
  rating: number;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  comment: string;

}
