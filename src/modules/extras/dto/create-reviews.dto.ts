import { IsInt, IsString } from "class-validator";

export class CreateExtraDto {
 
    @IsInt()
    rating: number

    @IsString()
    comment: string

}
