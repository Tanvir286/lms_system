import { IsString } from "class-validator";

export enum Category {
    Teachers = 'Teacher',
    Students = 'Student',
}

export class CreateWebInfroDto {
    @IsString()
    title: string;

    @IsString()
    description: string;


    image: any;

    @IsString()
    category: Category;
}
