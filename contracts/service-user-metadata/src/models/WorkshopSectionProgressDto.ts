/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EligibleWorkshopDto } from './EligibleWorkshopDto';
export type WorkshopSectionProgressDto = {
    sectionId: string;
    title: string;
    description: string;
    assessmentCompleted: boolean;
    assessmentAvailable: boolean;
    unlockedLevel: number;
    totalCount: number;
    completedCount: number;
    lockedCount: number;
    workshops: Array<EligibleWorkshopDto>;
};

