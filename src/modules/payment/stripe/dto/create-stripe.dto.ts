import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
export class CreateStripeDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
