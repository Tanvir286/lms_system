import { IsString } from "class-validator";

export class CreateHelpAndSupportDto {
    @IsString()
    full_name: string;

    @IsString()
    email: string;

    @IsString()
    message: string;

    @IsString()
    subject: string;



}
