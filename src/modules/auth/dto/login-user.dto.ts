import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail, MinLength } from 'class-validator';

export class LoginUserDto {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'sazzad@example.com' })
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({ example: 'password123' })
  password: string;
}
