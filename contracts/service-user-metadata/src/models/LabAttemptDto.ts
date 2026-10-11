/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LabAttemptResultDto } from './LabAttemptResultDto';
export type LabAttemptDto = {
    _id: string;
    labId: string;
    versionId: string;
    versionNumber: number;
    title: string;
    code: string;
    revision: number;
    status: 'in-progress' | 'completed';
    startedAt: string;
    updatedAt: string;
    result?: LabAttemptResultDto;
};

