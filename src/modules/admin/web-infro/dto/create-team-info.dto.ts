import { IsString } from 'class-validator';

export class CreateTeamInfoDto {
  @IsString()
  name: string;

  @IsString()
  designation: string;

  image: any;

  @IsString()
  description: string;
}
