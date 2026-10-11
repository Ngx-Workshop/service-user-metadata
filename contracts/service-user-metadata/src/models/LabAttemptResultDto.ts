/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LabSampleResultDto } from './LabSampleResultDto';
export type LabAttemptResultDto = {
    passed: boolean;
    passedTests: number;
    totalTests: number;
    durationMs: number;
    results: Array<LabSampleResultDto>;
};

