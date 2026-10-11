import { HttpService } from '@nestjs/axios';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import {
  assertLocalDatabase,
  localMode,
} from '../local-development/local-development';
import { WorkshopProgress } from './workshop-progress.schema';
import {
  AssessmentSource,
  SectionSource,
  WorkshopSource,
  sectionProgress,
} from './workshop-progress.policy';
import {
  examplePages,
  exampleSections,
  exampleWorkshops,
} from './workshop-progress.example';
import {
  WorkshopProgressDto,
  WorkshopReadingDto,
} from './workshop-progress.dto';

@Injectable()
export class WorkshopProgressService {
  constructor(
    @InjectModel(WorkshopProgress.name)
    private readonly progress: Model<WorkshopProgress>,
    private readonly http: HttpService
  ) {}

  private demo() {
    if (process.env.WORKSHOP_PROGRESS_DEMO !== 'true') return false;
    assertLocalDatabase();
    if (!localMode())
      throw new ServiceUnavailableException(
        'Workshop example requires isolated local development mode'
      );
    return true;
  }

  private async get<T>(
    baseKey: string,
    path: string,
    request: Request
  ): Promise<T> {
    const base = process.env[baseKey];
    if (!base)
      throw new ServiceUnavailableException(
        `Configure ${baseKey} to enable the live workshop journey`
      );
    const headers: Record<string, string> = {};
    // Never forward arbitrary incoming headers or a user-provided upstream URL.
    if (request.headers.cookie) headers.Cookie = request.headers.cookie;
    if (request.headers.authorization)
      headers.Authorization = request.headers.authorization;
    try {
      const response = await firstValueFrom(
        this.http.get<T>(`${base.replace(/\/$/, '')}/${path}`, {
          headers,
          timeout: 8000,
        })
      );
      return response.data;
    } catch {
      throw new ServiceUnavailableException(
        'Workshop or assessment data is unavailable. Please retry.'
      );
    }
  }

  private async sources(uuid: string, request: Request) {
    const progress: WorkshopProgress = (await this.progress
      .findOne({ uuid })
      .lean()
      .exec()) ?? {
      uuid,
      startedWorkshopIds: [],
      completedWorkshopIds: [],
      viewedPages: [],
      demoAssessmentSections: [],
      demoCompletedAssessmentIds: [],
    };
    if (this.demo())
      return {
        progress,
        sections: exampleSections,
        workshops: exampleWorkshops,
        assessments: exampleSections.map((s) => ({
          subject: s._id,
          completedCount: progress.demoAssessmentSections.includes(s._id)
            ? 1
            : 0,
          highestPassedLevel: 0,
          tests: [
            {
              id: `${s._id}-initial`,
              status: progress.demoAssessmentSections.includes(s._id)
                ? 'completed'
                : 'available',
            },
            ...(s._id === 'example-angular'
              ? [
                  {
                    id: 'example-components-test',
                    status: (
                      progress.demoCompletedAssessmentIds ?? []
                    ).includes('example-components-test')
                      ? 'completed'
                      : 'available',
                  },
                ]
              : []),
          ],
        })),
      };
    const [sectionMap, assessments] = await Promise.all([
      this.get<{ sections: Record<string, SectionSource> }>(
        'DOCKER_NET_NAME_DOCUMENT',
        'navigation/sections',
        request
      ),
      this.get<AssessmentSource[]>(
        'DOCKER_NET_NAME_ASSESSMENT',
        'assessment-test/learner/catalog',
        request
      ),
    ]);
    const sections = Object.values(sectionMap.sections);
    const workshops = (
      await Promise.all(
        sections.map((s) =>
          this.get<WorkshopSource[]>(
            'DOCKER_NET_NAME_DOCUMENT',
            `navigation/workshops?section=${encodeURIComponent(s._id)}`,
            request
          )
        )
      )
    ).flat();
    return { progress, sections, workshops, assessments };
  }

  async catalog(uuid: string, request: Request): Promise<WorkshopProgressDto> {
    const { progress, sections, workshops, assessments } = await this.sources(
      uuid,
      request
    );
    return {
      demo: this.demo(),
      sections: sections.map((section) =>
        sectionProgress(
          section,
          workshops,
          assessments.find((a) => a.subject === section._id),
          progress,
          assessments
        )
      ),
    };
  }

  private async eligible(uuid: string, id: string, request: Request) {
    const catalog = await this.catalog(uuid, request);
    const workshop = catalog.sections
      .flatMap((s) => s.workshops)
      .find((w) => w._id === id);
    if (!workshop)
      throw new ForbiddenException(
        'Complete the section assessment and preceding level before starting this workshop'
      );
    return workshop;
  }

  async start(uuid: string, id: string, request: Request) {
    await this.eligible(uuid, id, request);
    await this.progress
      .updateOne(
        { uuid },
        {
          $setOnInsert: { uuid },
          $addToSet: { startedWorkshopIds: id },
        },
        { upsert: true, runValidators: true }
      )
      .exec();
    return this.catalog(uuid, request);
  }

  async complete(uuid: string, id: string, request: Request) {
    const workshop = await this.eligible(uuid, id, request);
    const record = await this.progress.findOne({ uuid }).lean().exec();
    if (!record?.startedWorkshopIds.includes(id))
      throw new ForbiddenException('Start the workshop before completing it');
    if (workshop.status !== 'completed')
      throw new ForbiddenException(
        'View every workshop page and complete its assessments first'
      );
    return this.catalog(uuid, request);
  }

  async page(
    uuid: string,
    id: string,
    pageId: string,
    request: Request
  ): Promise<WorkshopReadingDto> {
    const workshop = await this.eligible(uuid, id, request);
    if (
      !workshop.workshopDocuments.some(
        (p) => p.kind === 'PAGE' && p._id === pageId
      )
    ) {
      throw new NotFoundException('Page does not belong to this workshop');
    }
    if (this.demo()) {
      const page = examplePages[pageId];
      if (!page) throw new NotFoundException('Example page not found');
      return page;
    }
    return this.get<WorkshopReadingDto>(
      'DOCKER_NET_NAME_DOCUMENT',
      `workshop/${encodeURIComponent(pageId)}`,
      request
    );
  }

  async seen(uuid: string, id: string, pageId: string, request: Request) {
    const record = await this.progress.findOne({ uuid }).lean().exec();
    if (!record?.startedWorkshopIds.includes(id))
      throw new ForbiddenException(
        'Start the workshop before viewing its pages'
      );
    // Check ownership, eligibility and successful content retrieval before accepting a visit.
    await this.page(uuid, id, pageId, request);
    await this.progress
      .updateOne(
        { uuid },
        { $addToSet: { viewedPages: { workshopId: id, pageId } } },
        { runValidators: true }
      )
      .exec();
    return this.catalog(uuid, request);
  }

  async resetExample(uuid: string) {
    if (!this.demo()) throw new NotFoundException();
    await this.progress.deleteOne({ uuid }).exec();
    return {
      demo: true,
      sections: exampleSections.map((s) =>
        sectionProgress(
          s,
          exampleWorkshops,
          {
            subject: s._id,
            completedCount: 0,
            highestPassedLevel: 0,
            tests: [{ status: 'available' }],
          },
          { startedWorkshopIds: [], completedWorkshopIds: [] }
        )
      ),
    };
  }

  async sampleWorkshopAssessment(
    uuid: string,
    testId: string,
    answer: string,
    request: Request
  ) {
    if (!this.demo()) throw new NotFoundException();
    const owner = exampleWorkshops.find((w) =>
      w.workshopDocuments.some(
        (p) => p.kind === 'ASSESSMENT_TEST' && p.resourceId === testId
      )
    );
    if (!owner) throw new NotFoundException('Example assessment not found');
    await this.eligible(uuid, owner._id, request);
    const record = await this.progress.findOne({ uuid }).lean().exec();
    if (!record?.startedWorkshopIds.includes(owner._id))
      throw new ForbiddenException('Start the workshop first');
    await this.progress
      .updateOne(
        { uuid },
        { $addToSet: { demoCompletedAssessmentIds: testId } },
        { runValidators: true }
      )
      .exec();
    return {
      correct: answer === 'component',
      catalog: await this.catalog(uuid, request),
    };
  }

  async sampleAssessment(
    uuid: string,
    sectionId: string,
    answer: string,
    request: Request
  ) {
    if (!this.demo()) throw new NotFoundException();
    if (!exampleSections.some((s) => s._id === sectionId))
      throw new NotFoundException('Example section not found');
    // Both outcomes unlock foundation study; the assessment is completed, not necessarily passed.
    await this.progress
      .updateOne(
        { uuid },
        {
          $setOnInsert: { uuid },
          $addToSet: { demoAssessmentSections: sectionId },
        },
        { upsert: true, runValidators: true }
      )
      .exec();
    return {
      correct: answer === 'component',
      catalog: await this.catalog(uuid, request),
    };
  }
}
