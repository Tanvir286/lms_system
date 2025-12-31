import { PartialType } from '@nestjs/swagger';
import { CreateHelpAndSupportDto } from './create-help_and_support.dto';

export class UpdateHelpAndSupportDto extends PartialType(CreateHelpAndSupportDto) {}
