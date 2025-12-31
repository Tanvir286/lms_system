import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
  })
  first_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
  })
  last_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'name of the user',
    example: 'Johnny',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Bio of the user',
    example:
      'Experienced Math teacher with a passion for helping students succeed.',
  })
  about_me?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The grade level for students',
    example: '10th Grade',
  })
  grade_level?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The highest education level for teachers',
    example: 'Masters in Education',
  })
  highest_education_level?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Teaching experience for teachers',
    example: '5 years',
  })
  teaching_experience?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'List of subjects taught by teacher',
    example: ['Math', 'Science'],
  })
  subjects_taught?: string[];

  @IsOptional()
  @ApiProperty({
    description: 'Hourly rate for teachers',
    example: 50,
  })
  hourly_rate?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'General availability for teachers',
    example: 'Monday to Friday, 9 AM to 5 PM',
  })
  general_availability?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Terms agreement for user',
    example: true,
  })
  is_agreed_terms?: boolean;

  @IsOptional()
  @ApiProperty({
    description: 'Application process agreement for teachers',
    example: true,
  })
  is_agree_application_process?: boolean;

  @IsOptional()
  @ApiProperty({
    description: 'Country',
    example: 'Nigeria',
  })
  country?: string;

  @IsOptional()
  @ApiProperty({
    description: 'State',
    example: 'Lagos',
  })
  state?: string;

  @IsOptional()
  @ApiProperty({
    description: 'City',
    example: 'Lagos',
  })
  city?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Local government',
    example: 'Lagos',
  })
  local_government?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Zip code',
    example: '123456',
  })
  zip_code?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Phone number',
    example: '+91 9876543210',
  })
  phone_number?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Address',
    example: 'New York, USA',
  })
  address?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Gender',
    example: 'male',
  })
  gender?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Date of birth',
    example: '14/11/2001',
  })
  date_of_birth?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim());
    }
  })
  grades_taught?: string[];
}
