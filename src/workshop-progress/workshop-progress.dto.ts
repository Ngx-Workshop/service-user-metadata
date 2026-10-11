import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class JourneyEntryDto {
  @ApiProperty() _id: string;
  @ApiProperty({ enum: ['PAGE', 'ASSESSMENT_TEST', 'CODING_LAB'] })
  kind: 'PAGE' | 'ASSESSMENT_TEST' | 'CODING_LAB';
  @ApiProperty() name: string;
  @ApiProperty() sortId: number;
  @ApiPropertyOptional() resourceId?: string;
}
export class EligibleWorkshopDto {
  @ApiProperty() _id: string;
  @ApiProperty() sectionId: string;
  @ApiProperty() name: string;
  @ApiProperty() summary: string;
  @ApiProperty() level: number;
  @ApiProperty() sortId: number;
  @ApiProperty({ enum: ['available', 'in-progress', 'completed'] })
  status: 'available' | 'in-progress' | 'completed';
  @ApiProperty({ type: [String] }) viewedPageIds: string[];
  @ApiProperty() pageCount: number;
  @ApiProperty({ type: [String] }) completedAssessmentIds: string[];
  @ApiProperty() assessmentCount: number;
  @ApiProperty() assessmentsCompleted: boolean;
  @ApiProperty({ type: [JourneyEntryDto] })
  workshopDocuments: JourneyEntryDto[];
}
export class WorkshopSectionProgressDto {
  @ApiProperty() sectionId: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() assessmentCompleted: boolean;
  @ApiProperty() assessmentAvailable: boolean;
  @ApiProperty() unlockedLevel: number;
  @ApiProperty() totalCount: number;
  @ApiProperty() completedCount: number;
  @ApiProperty() lockedCount: number;
  @ApiProperty({ type: [EligibleWorkshopDto] })
  workshops: EligibleWorkshopDto[];
}
export class WorkshopProgressDto {
  @ApiProperty() demo: boolean;
  @ApiProperty({ type: [WorkshopSectionProgressDto] })
  sections: WorkshopSectionProgressDto[];
}
export class WorkshopReadingDto {
  @ApiProperty() name: string;
  @ApiProperty({
    description: 'Serialized document blocks; render as sanitized content',
  })
  html: string;
}
export class DemoAssessmentDto {
  @ApiProperty({ enum: ['component', 'database'] })
  @IsString()
  @IsIn(['component', 'database'])
  answer: string;
}
