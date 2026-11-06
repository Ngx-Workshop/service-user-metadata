import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsString,
  IsUUID,
  Matches,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Role } from '@tmdjr/ngx-auth-client';
export class AdminCreateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() lastName?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ writeOnly: true, minLength: 12, maxLength: 100 })
  @IsString()
  @MinLength(12)
  @MaxLength(100)
  @Matches(/^(?=.*[0-9])[a-zA-Z0-9!@#$%^&*]{12,100}$/)
  password: string;
  @ApiProperty({ enum: Role }) @IsEnum(Role) role: Role;
  @ApiProperty() @IsUUID('4') requestId: string;
}
