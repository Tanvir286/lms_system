import { IsString, IsDate, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class ReqDto {
    @IsString()
    @IsOptional()
    name: string;

    @IsString()
    reason: string;
}