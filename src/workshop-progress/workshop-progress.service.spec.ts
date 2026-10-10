import { HttpService } from '@nestjs/axios';
import { Request } from 'express';
import { Model } from 'mongoose';
import { of } from 'rxjs';
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
    };
    model.findOne.mockImplementation(() => ({
      lean: () => ({ exec: async () => record }),
    }));
    model.updateOne.mockReturnValue({
      exec: async () => ({ acknowledged: true }),
    });
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
  it('makes duplicate completion idempotent and checks the page belongs to the workshop', async () => {
    record.demoAssessmentSections = ['example-angular'];
    record.startedWorkshopIds = ['example-components'];
    record.completedWorkshopIds = ['example-components'];
    await service.complete('learner', 'example-components', request);
    expect(model.updateOne).toHaveBeenCalledWith(
      { uuid: 'learner' },
      { $addToSet: { completedWorkshopIds: 'example-components' } },
      { runValidators: true }
    );
    await expect(
      service.page(
        'learner',
        'example-components',
        'example-signals-page',
        request
      )
    ).rejects.toThrow('Page does not belong');
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
    process.env.WORKSHOP_DOCUMENT_API_URL = 'http://document.invalid/api';
    process.env.WORKSHOP_ASSESSMENT_API_URL = 'http://assessment.invalid/api';
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
});
