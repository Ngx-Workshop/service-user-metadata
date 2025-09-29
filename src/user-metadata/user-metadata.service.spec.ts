import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { UserMetadata } from './schemas/user-metadata.schema';
import { UserMetadataService } from './user-metadata.service';

describe('UserMetadataService', () => {
  let service: UserMetadataService;
  const findOneAndUpdateMock = jest.fn();
  const execMock = jest.fn();

  beforeEach(async () => {
    findOneAndUpdateMock.mockReturnValue({ exec: execMock });
    execMock.mockResolvedValue({ uuid: 'uuid', email: 'test@example.com' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserMetadataService,
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
    findOneAndUpdateMock.mockReset();
    execMock.mockReset();
  });

  it('upserts user metadata without conflicting operators', async () => {
    await service.upsertByUuid({
      sub: 'uuid',
      email: 'test@example.com',
    } as any);

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
});
