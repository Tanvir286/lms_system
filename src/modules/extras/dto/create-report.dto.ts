import { IsString } from "class-validator"

export class CreateReportDto {

    @IsString()
    reason: string

    @IsString()
    description: string
}