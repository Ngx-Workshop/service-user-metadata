import { PartialType } from '@nestjs/swagger';
import { CreateUserMetadataDto } from './create.dto';

/**
 * UPDATE DTO – Partial of Create DTO
 */
export class UpdateUserMetadataDto extends PartialType(CreateUserMetadataDto) {}
