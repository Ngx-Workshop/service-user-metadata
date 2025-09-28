import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UserMetadataDto {
  @ApiProperty() _id: string;

  @ApiProperty()
  uuid: string;

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

export class UpdateUserMetadataDto extends PartialType(CreateUserMetadataDto) {}
