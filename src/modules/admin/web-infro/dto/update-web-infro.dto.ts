import { PartialType } from '@nestjs/swagger';
import { CreateWebInfroDto } from './create-web-infro.dto';

export class UpdateWebInfroDto extends PartialType(CreateWebInfroDto) {}
