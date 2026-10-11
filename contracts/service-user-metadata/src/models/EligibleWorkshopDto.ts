/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JourneyEntryDto } from './JourneyEntryDto';
export type EligibleWorkshopDto = {
    _id: string;
    sectionId: string;
    name: string;
    summary: string;
    level: number;
    sortId: number;
    status: 'available' | 'in-progress' | 'completed';
    viewedPageIds: Array<string>;
    pageCount: number;
    completedAssessmentIds: Array<string>;
    assessmentCount: number;
    assessmentsCompleted: boolean;
    workshopDocuments: Array<JourneyEntryDto>;
};

