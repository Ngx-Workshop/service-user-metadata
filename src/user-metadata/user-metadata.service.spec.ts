import { HttpService } from '@nestjs/axios';
import { IActiveUserData } from '@tmdjr/ngx-auth-client';
import { Request } from 'express';
import { localDatabaseUri } from '../local-development/local-development';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { UserMetadata } from './schemas/user-metadata.schema';
import { UserMetadataService } from './user-metadata.service';

describe('UserMetadataService', () => {
  let service: UserMetadataService;
  const findOneAndUpdateMock = jest.fn();
  const execMock = jest.fn();
  const http = { put: jest.fn() };
  const original = { ...process.env };

  beforeEach(async () => {
    findOneAndUpdateMock.mockReturnValue({ exec: execMock });
    execMock.mockResolvedValue({ uuid: 'uuid', email: 'test@example.com' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserMetadataService,
        { provide: HttpService, useValue: http },
        {
          provide: getModelToken(UserMetadata.name),
          useValue: {
            findOneAndUpdate: findOneAndUpdateMock,
          },
        },
      ],
    }).compile();

    service = module.get<UserMetadataService>(UserMetadataService);
  });

  afterEach(() => {
    process.env = { ...original };
    http.put.mockReset();
    findOneAndUpdateMock.mockReset();
    execMock.mockReset();
  });

  it('upserts user metadata without conflicting operators', async () => {
    await service.upsertByUuid({
      sub: 'uuid',
      email: 'test@example.com',
    } as IActiveUserData);

    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { uuid: 'uuid' },
      {
        $setOnInsert: { uuid: 'uuid' },
        $set: {
          email: 'test@example.com',
          lastUpdated: expect.any(Date),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    expect(execMock).toHaveBeenCalledTimes(1);
  });

  it('updates only local metadata roles without syncing the hosted identity provider', async () => {
    process.env.USER_METADATA_LOCAL_DEV = 'true';
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = localDatabaseUri;
    const sync = jest.spyOn(service, 'updateUserRole');
    await service.updateRole('local-user', 'publisher', {} as Request);
    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { uuid: 'local-user' },
      { role: 'publisher', lastUpdated: expect.any(Date) },
      { new: true }
    );
    expect(sync).not.toHaveBeenCalled();
    expect(http.put).not.toHaveBeenCalled();
  });

  it('also prevents direct sync calls from leaving local mode', async () => {
    process.env.USER_METADATA_LOCAL_DEV = 'true';
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = localDatabaseUri;
    await service.updateUserRole('local-user', 'admin', {} as Request);
    expect(http.put).not.toHaveBeenCalled();
  });

  it('preserves ordinary-mode role synchronization', async () => {
    delete process.env.USER_METADATA_LOCAL_DEV;
    const sync = jest.spyOn(service, 'updateUserRole').mockResolvedValue();
    const request = {} as Request;
    await service.updateRole('user', 'publisher', request);
    expect(sync).toHaveBeenCalledWith('user', 'publisher', request);
  });

  it('rejects unsafe database configuration before direct local sync', async () => {
    process.env.USER_METADATA_LOCAL_DEV = 'true';
    process.env.NODE_ENV = 'development';
    process.env.MONGODB_URI = 'mongodb://remote/production';
    await expect(
      service.updateUserRole('local-user', 'admin', {} as Request)
    ).rejects.toThrow('isolated');
    expect(http.put).not.toHaveBeenCalled();
  });
});
