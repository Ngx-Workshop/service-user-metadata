import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsMongoId,
  IsString,
  MaxLength,
  Min,
  IsUUID,
} from 'class-validator';
export class StartLabAttemptDto {
  @ApiProperty() @IsMongoId() labId: string;
  @ApiProperty() @IsUUID() requestId: string;
}
export class SaveLabAttemptDto {
  @ApiProperty() @IsString() @MaxLength(50000) code: string;
  @ApiProperty() @IsInt() @Min(0) revision: number;
}
export class SubmitLabAttemptDto extends SaveLabAttemptDto {}
export class LabSampleResultDto {
  @ApiProperty() name: string;
  @ApiProperty({ enum: ['passed', 'failed', 'error', 'timeout'] })
  status: string;
  @ApiPropertyOptional() message?: string;
}
export class LabAttemptResultDto {
  @ApiProperty() passed: boolean;
  @ApiProperty() passedTests: number;
  @ApiProperty() totalTests: number;
  @ApiProperty() durationMs: number;
  @ApiProperty({ type: [LabSampleResultDto] }) results: LabSampleResultDto[];
}
export class LabAttemptDto {
  @ApiProperty() _id: string;
  @ApiProperty() labId: string;
  @ApiProperty() versionId: string;
  @ApiProperty() versionNumber: number;
  @ApiProperty() title: string;
  @ApiProperty() code: string;
  @ApiProperty() revision: number;
  @ApiProperty({ enum: ['in-progress', 'completed'] }) status: string;
  @ApiProperty() startedAt: string;
  @ApiProperty() updatedAt: string;
  @ApiPropertyOptional({ type: LabAttemptResultDto })
  result?: LabAttemptResultDto;
}
