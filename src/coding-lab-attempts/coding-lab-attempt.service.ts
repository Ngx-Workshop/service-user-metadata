import {
  Injectable,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { HttpService } from '@nestjs/axios';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import { CodingLabAttempt } from './coding-lab-attempt.schema';
import {
  LabAttemptDto,
  LabAttemptResultDto,
  SaveLabAttemptDto,
  StartLabAttemptDto,
} from './coding-lab-attempt.dto';
import type { components } from './coding-labs.contract';
type PublishedLab = components['schemas']['PublishedLabDto'];
@Injectable()
export class CodingLabAttemptService {
  constructor(
    @InjectModel(CodingLabAttempt.name)
    private readonly attempts: Model<CodingLabAttempt>,
    private readonly http: HttpService
  ) {}
  private async upstream<T>(
    path: string,
    request: Request,
    body?: unknown
  ): Promise<T> {
    const base = process.env.CODING_LABS_BASE_URL;
    if (!base)
      throw new ServiceUnavailableException(
        'Configure CODING_LABS_BASE_URL to enable coding labs'
      );
    const headers: Record<string, string> = {};
    if (request.headers.cookie) headers.Cookie = request.headers.cookie;
    if (request.headers.authorization)
      headers.Authorization = request.headers.authorization;
    try {
      const url = `${base.replace(/\/$/, '')}/published-labs/${path}`;
      const options = { headers, timeout: 75000 };
      const response = await firstValueFrom(
        body === undefined
          ? this.http.get<T>(url, options)
          : this.http.post<T>(url, body, options)
      );
      return response.data;
    } catch (error) {
      if (
        isAxiosError(error) &&
        [400, 401, 403, 404, 429].includes(error.response?.status ?? 0)
      )
        throw new HttpException(
          'Lab request could not be completed. Refresh or retry.',
          error.response!.status
        );
      throw new ServiceUnavailableException(
        'The lab runner is unavailable. Your code has been preserved.'
      );
    }
  }
  private dto(attempt: CodingLabAttempt & { _id: unknown }): LabAttemptDto {
    return {
      _id: String(attempt._id),
      labId: attempt.labId,
      versionId: attempt.versionId,
      versionNumber: attempt.versionNumber,
      title: attempt.title,
      code: attempt.code,
      revision: attempt.revision,
      status: attempt.status,
      startedAt: attempt.startedAt,
      updatedAt: attempt.updatedAt,
      result: attempt.result,
    };
  }
  async history(uuid: string) {
    const records = await this.attempts
      .find({ uuid })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return records.map((record) => this.dto(record));
  }
  private async owned(uuid: string, id: string) {
    const record = await this.attempts.findOne({ _id: id, uuid }).lean().exec();
    if (!record) throw new NotFoundException('Lab attempt not found');
    return record;
  }
  async get(uuid: string, id: string) {
    return this.dto(await this.owned(uuid, id));
  }
  async start(uuid: string, dto: StartLabAttemptDto, request: Request) {
    const previous = await this.attempts
      .findOne({ uuid, requestId: dto.requestId })
      .lean()
      .exec();
    if (previous) return this.dto(previous);
    const content = await this.upstream<PublishedLab>(dto.labId, request);
    const now = new Date().toISOString();
    try {
      const attempt = await this.attempts
        .findOneAndUpdate(
          { uuid, labId: dto.labId, status: 'in-progress' },
          {
            $setOnInsert: {
              uuid,
              requestId: dto.requestId,
              labId: dto.labId,
              versionId: content.versionId,
              versionNumber: content.versionNumber,
              title: content.title,
              code: content.starterCode,
              revision: 0,
              startedAt: now,
              updatedAt: now,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
        .lean()
        .exec();
      return this.dto(attempt!);
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const existing = await this.attempts
        .findOne({
          uuid,
          $or: [
            { requestId: dto.requestId },
            { labId: dto.labId, status: 'in-progress' },
          ],
        })
        .lean()
        .exec();
      if (!existing)
        throw new ConflictException('Attempt changed. Please retry.');
      return this.dto(existing);
    }
  }
  private writable(uuid: string, id: string, revision: number) {
    return {
      _id: id,
      uuid,
      revision,
      status: 'in-progress',
      $or: [
        { leaseUntil: { $exists: false } },
        { leaseUntil: { $lt: new Date() } },
      ],
    };
  }
  async save(uuid: string, id: string, dto: SaveLabAttemptDto) {
    await this.owned(uuid, id);
    const updated = await this.attempts
      .findOneAndUpdate(
        this.writable(uuid, id, dto.revision),
        {
          $set: { code: dto.code, updatedAt: new Date().toISOString() },
          $inc: { revision: 1 },
        },
        { new: true }
      )
      .lean()
      .exec();
    if (!updated)
      throw new ConflictException(
        'This attempt changed or is being graded. Reload before saving.'
      );
    return this.dto(updated);
  }
  async submit(
    uuid: string,
    id: string,
    dto: SaveLabAttemptDto,
    request: Request
  ) {
    if (!dto.code.trim())
      throw new BadRequestException('Enter a solution before submitting');
    const current = await this.owned(uuid, id);
    if (current.status === 'completed') return this.dto(current);
    const token = randomUUID();
    const locked = await this.attempts
      .findOneAndUpdate(
        this.writable(uuid, id, dto.revision),
        {
          $set: {
            code: dto.code,
            leaseToken: token,
            leaseUntil: new Date(Date.now() + 120000),
            updatedAt: new Date().toISOString(),
          },
          $inc: { revision: dto.code === current.code ? 0 : 1 },
        },
        { new: true }
      )
      .lean()
      .exec();
    if (!locked)
      throw new ConflictException(
        'This attempt changed or is being graded. Reload before submitting.'
      );
    try {
      const grade = await this.upstream<components['schemas']['LabGradeDto']>(
        `${current.labId}/grade`,
        request,
        { versionId: current.versionId, code: dto.code }
      );
      const result: LabAttemptResultDto = {
        passed: grade.passed,
        passedTests: grade.passedTests,
        totalTests: grade.totalTests,
        durationMs: grade.durationMs,
        results: grade.results.map((r) => ({
          name: r.name,
          status: r.status,
          message: r.message,
        })),
      };
      const completed = await this.attempts
        .findOneAndUpdate(
          { _id: id, uuid, leaseToken: token },
          {
            $set: {
              result,
              status: 'completed',
              updatedAt: new Date().toISOString(),
            },
            $inc: { revision: 1 },
            $unset: { leaseToken: '', leaseUntil: '' },
          },
          { new: true }
        )
        .lean()
        .exec();
      if (!completed)
        throw new ConflictException(
          'Submission lease expired. Reload this attempt.'
        );
      return this.dto(completed);
    } finally {
      await this.attempts
        .updateOne(
          { _id: id, uuid, leaseToken: token },
          { $unset: { leaseToken: '', leaseUntil: '' } }
        )
        .exec();
    }
  }
}
