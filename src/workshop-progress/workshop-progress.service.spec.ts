import { HttpService } from '@nestjs/axios';
import { Request } from 'express';
import { Model } from 'mongoose';
import { of, throwError } from 'rxjs';
import { WorkshopProgressService } from './workshop-progress.service';
import { WorkshopProgress } from './workshop-progress.schema';
import { localDatabaseUri } from '../local-development/local-development';

const request = {
  headers: {
    cookie: 'session=owned',
    authorization: 'Bearer owned',
    'x-untrusted': 'ignored',
  },
} as unknown as Request;
describe('Workshop progress commands', () => {
  const original = { ...process.env };
  let service: WorkshopProgressService;
  let record: WorkshopProgress;
  const model = { findOne: jest.fn(), updateOne: jest.fn() };
  const http = { get: jest.fn() };
  beforeEach(() => {
    process.env.USER_METADATA_LOCAL_DEV = 'true';
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = localDatabaseUri;
    process.env.WORKSHOP_PROGRESS_DEMO = 'true';
    record = {
      uuid: 'learner',
      startedWorkshopIds: [],
      completedWorkshopIds: [],
      demoAssessmentSections: [],
      demoCompletedAssessmentIds: [],
      viewedPages: [],
    };
    model.findOne.mockImplementation(() => ({
      lean: () => ({ exec: async () => record }),
    }));
    model.updateOne.mockImplementation((_filter, update) => ({
      exec: async () => {
        for (const [key, value] of Object.entries(update.$addToSet ?? {})) {
          const values = record[key as keyof WorkshopProgress] as unknown[];
          if (!values.some((v) => JSON.stringify(v) === JSON.stringify(value)))
            values.push(value);
        }
        return { acknowledged: true };
      },
    }));
    service = new WorkshopProgressService(
      model as unknown as Model<WorkshopProgress>,
      http as unknown as HttpService
    );
  });
  afterEach(() => {
    process.env = { ...original };
    jest.clearAllMocks();
  });
  it('rejects direct locked workshop commands', async () => {
    await expect(
      service.start('learner', 'example-signals', request)
    ).rejects.toThrow('Complete the section assessment');
    expect(model.updateOne).not.toHaveBeenCalled();
  });
  it('does not accept completion before starting', async () => {
    record.demoAssessmentSections = ['example-angular'];
    await expect(
      service.complete('learner', 'example-components', request)
    ).rejects.toThrow('Start the workshop');
    expect(model.updateOne).not.toHaveBeenCalled();
  });
  it('records authenticated starts with an atomic set operation', async () => {
    record.demoAssessmentSections = ['example-angular'];
    await service.start('learner', 'example-components', request);
    expect(model.updateOne).toHaveBeenCalledWith(
      { uuid: 'learner' },
      {
        $setOnInsert: { uuid: 'learner' },
        $addToSet: { startedWorkshopIds: 'example-components' },
      },
      { upsert: true, runValidators: true }
    );
  });
  it('rejects completion without every page and the exact assessment, and makes repeat visits idempotent', async () => {
    record.demoAssessmentSections = ['example-angular'];
    record.startedWorkshopIds = ['example-components'];
    await expect(
      service.complete('learner', 'example-components', request)
    ).rejects.toThrow('View every workshop page');
    await expect(
      service.seen(
        'learner',
        'example-components',
        'example-signals-page',
        request
      )
    ).rejects.toThrow('Page does not belong');
    expect(record.viewedPages).toEqual([]);
    await service.seen(
      'learner',
      'example-components',
      'example-components-page',
      request
    );
    await service.seen(
      'learner',
      'example-components',
      'example-components-page',
      request
    );
    expect(record.viewedPages).toHaveLength(1);
    await service.seen(
      'learner',
      'example-components',
      'example-components-practice',
      request
    );
    expect(
      (await service.catalog('learner', request)).sections[0].completedCount
    ).toBe(0);
    await service.sampleWorkshopAssessment(
      'learner',
      'example-components-test',
      'database',
      request
    );
    const catalog = await service.complete(
      'learner',
      'example-components',
      request
    );
    expect(catalog.sections[0].completedCount).toBe(1);
    expect(
      (await service.complete('learner', 'example-components', request))
        .sections[0].completedCount
    ).toBe(1);
  });
  it('does not record page visits before a workshop is started', async () => {
    record.demoAssessmentSections = ['example-angular'];
    await expect(
      service.seen(
        'learner',
        'example-components',
        'example-components-page',
        request
      )
    ).rejects.toThrow('Start the workshop');
    expect(model.updateOne).not.toHaveBeenCalled();
  });
  it('completes when the last page is seen after the workshop assessment', async () => {
    record.demoAssessmentSections = ['example-angular'];
    await service.start('learner', 'example-components', request);
    await service.sampleWorkshopAssessment(
      'learner',
      'example-components-test',
      'component',
      request
    );
    await service.seen(
      'learner',
      'example-components',
      'example-components-practice',
      request
    );
    const catalog = await service.seen(
      'learner',
      'example-components',
      'example-components-page',
      request
    );
    expect(catalog.sections[0].completedCount).toBe(1);
  });
  it('disables the sample write path outside explicit local example mode', async () => {
    process.env.WORKSHOP_PROGRESS_DEMO = 'false';
    await expect(
      service.sampleAssessment(
        'learner',
        'example-angular',
        'component',
        request
      )
    ).rejects.toThrow();
    expect(model.updateOne).not.toHaveBeenCalled();
  });
  it('uses exact section IDs and authenticated upstream assessment results in live mode', async () => {
    process.env.WORKSHOP_PROGRESS_DEMO = 'false';
    process.env.DOCKER_NET_NAME_DOCUMENT = 'http://document.invalid/api';
    process.env.DOCKER_NET_NAME_ASSESSMENT = 'http://assessment.invalid/api';
    http.get.mockImplementation((url: string) =>
      of({
        data: url.endsWith('navigation/sections')
          ? {
              sections: {
                angular: { _id: 'angular', sectionTitle: 'Angular' },
              },
            }
          : url.includes('learner/catalog')
            ? [
                {
                  subject: 'different-id',
                  completedCount: 1,
                  highestPassedLevel: 3,
                  tests: [],
                },
              ]
            : [
                {
                  _id: 'w',
                  sectionId: 'angular',
                  name: 'Workshop',
                  summary: '',
                  level: 1,
                  sortId: 0,
                  workshopDocuments: [],
                },
              ],
      })
    );
    const catalog = await service.catalog('learner', request);
    expect(catalog.sections[0].workshops).toEqual([]);
    expect(http.get).toHaveBeenCalledWith(
      'http://assessment.invalid/api/assessment-test/learner/catalog',
      {
        headers: { Cookie: 'session=owned', Authorization: 'Bearer owned' },
        timeout: 8000,
      }
    );
  });
  it('reconciles live assessment completion on refresh and never counts unavailable page content', async () => {
    process.env.WORKSHOP_PROGRESS_DEMO = 'false';
    process.env.DOCKER_NET_NAME_DOCUMENT = 'http://document.invalid/api';
    process.env.DOCKER_NET_NAME_ASSESSMENT = 'http://assessment.invalid/api';
    record.startedWorkshopIds = ['live-workshop'];
    record.viewedPages = [{ workshopId: 'live-workshop', pageId: 'first' }];
    let completed = false;
    http.get.mockImplementation((url: string) => {
      if (url.endsWith('workshop/second')) return throwError(() => new Error('Content unavailable'));
      return of({ data: url.endsWith('navigation/sections')
        ? { sections: { angular: { _id: 'angular', sectionTitle: 'Angular' } } }
        : url.includes('learner/catalog')
          ? [{ subject: 'angular', completedCount: 1, highestPassedLevel: 0, tests: [{ id: 'required', status: completed ? 'completed' : 'available' }] }]
          : [{ _id: 'live-workshop', sectionId: 'angular', name: 'Live', summary: '', sortId: 0, workshopDocuments: [
            { _id: 'first', kind: 'PAGE', name: 'First', sortId: 0 },
            { _id: 'second', kind: 'PAGE', name: 'Second', sortId: 1 },
            { _id: 'assessment', kind: 'ASSESSMENT_TEST', resourceId: 'required', name: 'Test', sortId: 2 },
          ] }] });
    });
    await expect(service.seen('learner', 'live-workshop', 'second', request)).rejects.toThrow('unavailable');
    expect(record.viewedPages).toHaveLength(1);
    expect(model.updateOne).not.toHaveBeenCalled();
    record.viewedPages.push({ workshopId: 'live-workshop', pageId: 'second' });
    expect((await service.catalog('learner', request)).sections[0].completedCount).toBe(0);
    completed = true;
    expect((await service.catalog('learner', request)).sections[0].completedCount).toBe(1);
  });

});
