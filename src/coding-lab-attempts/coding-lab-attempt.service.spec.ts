import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CodingLabAttemptService } from './coding-lab-attempt.service';
import { Request } from 'express';
import { of, throwError } from 'rxjs';
const record = {
  _id: 'attempt',
  uuid: 'user',
  requestId: 'request',
  labId: 'lab',
  versionId: 'version',
  versionNumber: 1,
  title: 'Sum',
  code: 'starter',
  revision: 0,
  status: 'in-progress',
  startedAt: 'date',
  updatedAt: 'date',
};
const query = (value: unknown) => ({
  lean: () => ({ exec: jest.fn().mockResolvedValue(value) }),
  exec: jest.fn().mockResolvedValue(value),
});
describe('Owned coding lab attempts', () => {
  let service: CodingLabAttemptService;
  let model: {
    findOne: jest.Mock;
    find: jest.Mock;
    findOneAndUpdate: jest.Mock;
    updateOne: jest.Mock;
  };
  let http: { get: jest.Mock; post: jest.Mock };
  const request = {
    headers: {
      cookie: 'session=test',
      authorization: 'Bearer test',
      'x-private': 'discard',
    },
  } as unknown as Request;
  beforeEach(() => {
    process.env.CODING_LABS_BASE_URL = 'http://coding-labs';
    model = {
      findOne: jest.fn(() => query(record)),
      find: jest.fn(() => ({ sort: () => query([record]) })),
      findOneAndUpdate: jest.fn(() => query(record)),
      updateOne: jest.fn(() => query({})),
    };
    http = {
      get: jest.fn(() =>
        of({
          data: {
            versionId: 'version',
            versionNumber: 1,
            title: 'Sum',
            starterCode: 'starter',
          },
        })
      ),
      post: jest.fn(() =>
        of({
          data: {
            passed: true,
            passedTests: 2,
            totalTests: 2,
            durationMs: 10,
            results: [
              { name: 'sample', status: 'passed', expected: 'discard' },
            ],
          },
        })
      ),
    };
    service = new CodingLabAttemptService(model as never, http as never);
  });
  afterEach(() => {
    delete process.env.CODING_LABS_BASE_URL;
  });
  it('scopes history and detail to the active user and excludes identity/leases', async () => {
    const history = await service.history('user');
    expect(model.find).toHaveBeenCalledWith({ uuid: 'user' });
    expect(history[0]).not.toHaveProperty('uuid');
    await service.get('other-user', 'attempt');
    expect(model.findOne).toHaveBeenCalledWith({
      _id: 'attempt',
      uuid: 'other-user',
    });
  });
  it('returns not found for attempts owned by someone else', async () => {
    model.findOne.mockReturnValue(query(null));
    await expect(
      service.save('other-user', 'attempt', { code: 'solution', revision: 0 })
    ).rejects.toThrow(NotFoundException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('replays an idempotent start without changing an old attempt', async () => {
    const result = await service.start(
      'user',
      { labId: 'lab', requestId: 'request' },
      request
    );
    expect(result._id).toBe('attempt');
    expect(http.get).not.toHaveBeenCalled();
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('retry creates or resumes an active attempt from published starter code', async () => {
    model.findOne.mockReturnValue(query(null));
    await service.start(
      'user',
      { labId: 'lab', requestId: 'new-request' },
      request
    );
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { uuid: 'user', labId: 'lab', status: 'in-progress' },
      {
        $setOnInsert: expect.objectContaining({
          code: 'starter',
          versionId: 'version',
          requestId: 'new-request',
        }),
      },
      expect.objectContaining({ upsert: true })
    );
    expect(http.get).toHaveBeenCalledWith(
      'http://coding-labs/published-labs/lab',
      expect.objectContaining({
        headers: { Cookie: 'session=test', Authorization: 'Bearer test' },
      })
    );
  });
  it('conflicts on stale saves or grading attempts', async () => {
    model.findOneAndUpdate.mockReturnValue(query(null));
    await expect(
      service.save('user', 'attempt', { code: 'solution', revision: 3 })
    ).rejects.toThrow(ConflictException);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: 'user',
        revision: 3,
        status: 'in-progress',
      }),
      expect.anything(),
      expect.anything()
    );
  });
  it('persists only server scores and sample feedback after submission', async () => {
    model.findOneAndUpdate
      .mockReturnValueOnce(query(record))
      .mockReturnValueOnce(query({ ...record, status: 'completed' }));
    await service.submit(
      'user',
      'attempt',
      { code: 'solution', revision: 0 },
      request
    );
    expect(http.post).toHaveBeenCalledWith(
      'http://coding-labs/published-labs/lab/grade',
      { versionId: 'version', code: 'solution' },
      expect.anything()
    );
    expect(model.findOneAndUpdate.mock.calls[1][1].$set.result).toEqual({
      passed: true,
      passedTests: 2,
      totalTests: 2,
      durationMs: 10,
      results: [{ name: 'sample', status: 'passed', message: undefined }],
    });
    expect(model.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: 'user', leaseToken: expect.any(String) }),
      { $unset: { leaseToken: '', leaseUntil: '' } }
    );
  });
  it('replays completed submission without grading twice', async () => {
    model.findOne.mockReturnValue(query({ ...record, status: 'completed' }));
    await service.submit(
      'user',
      'attempt',
      { code: 'solution', revision: 0 },
      request
    );
    expect(http.post).not.toHaveBeenCalled();
  });
  it('releases the lease and keeps code when the runner fails', async () => {
    http.post.mockReturnValue(throwError(() => new Error('Offline')));
    await expect(
      service.submit(
        'user',
        'attempt',
        { code: 'solution', revision: 0 },
        request
      )
    ).rejects.toThrow(ServiceUnavailableException);
    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(model.findOneAndUpdate.mock.calls[0][1].$set.code).toBe('solution');
    expect(model.updateOne).toHaveBeenCalled();
  });
  it('refuses a duplicate grading lease without calling the runner', async () => {
    model.findOneAndUpdate.mockReturnValue(query(null));
    await expect(
      service.submit(
        'user',
        'attempt',
        { code: 'solution', revision: 0 },
        request
      )
    ).rejects.toThrow(ConflictException);
    expect(http.post).not.toHaveBeenCalled();
  });
});
