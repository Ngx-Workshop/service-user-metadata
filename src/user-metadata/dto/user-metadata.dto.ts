import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Role } from '@tmdjr/ngx-auth-client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}

export class UserMetadataDto {
  @ApiProperty() _id: string;

  @ApiProperty()
  uuid: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ default: 'No description provided' })
  description?: string;

  @ApiProperty() __v: number;
}

/**
 * CREATE DTO for UserMetadata
 */
export class CreateUserMetadataDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  uuid: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ default: 'No description provided' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateUserMetadataDto extends PartialType(
  OmitType(CreateUserMetadataDto, ['uuid'] as const)
) {}

export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}

export class PaginatedUserMetadataDto {
  @ApiProperty({ type: [UserMetadataDto] })
  data: UserMetadataDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class SearchUserMetadataQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by first name, last name, uuid or email',
  })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({ enum: Role, description: 'Filter by user role' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
