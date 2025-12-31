import { IsDate, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class acceptReqDto {
    @IsOptional() 
    @IsDate()
    @Type(() => Date)
    rescheduled_date?: Date;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    reject_reason?: string;

    @IsOptional()
    @IsString()
    join_link: string;


}
