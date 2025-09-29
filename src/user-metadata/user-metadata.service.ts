import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { IActiveUserData } from '@tmdjr/ngx-auth-client';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import {
  CreateUserMetadataDto,
  PaginatedUserMetadataDto,
  UpdateUserMetadataDto,
  UserMetadataDto,
} from './dto/user-metadata.dto';
import {
  UserMetadata,
  UserMetadataDocument,
} from './schemas/user-metadata.schema';

@Injectable()
export class UserMetadataService {
  constructor(
    @InjectModel(UserMetadata.name)
    private userMetadataModel: Model<UserMetadataDocument>
  ) {}

  async upsertByUuid({
    sub: uuid,
    email,
  }: IActiveUserData): Promise<UserMetadata> {
    return this.userMetadataModel
      .findOneAndUpdate(
        { uuid },
        {
          $setOnInsert: { uuid },
          $set: { email, lastUpdated: new Date() },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      .exec();
  }

  async create(
    createUserMetadataDto: CreateUserMetadataDto
  ): Promise<UserMetadata> {
    try {
      const createUserMetadata = new this.userMetadataModel({
        ...createUserMetadataDto,
        lastUpdated: new Date(),
      });
      return await createUserMetadata.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'UserMetadata with this name already exists'
        );
      }
      throw error;
    }
  }

  async findOne(user: IActiveUserData): Promise<UserMetadata> {
    // Fallback: treat provided id as uuid
    const userMetadata = await this.userMetadataModel
      .findOne({ uuid: user.sub })
      .exec();
    if (userMetadata) return userMetadata;

    // Upsert a new record with this uuid if none exists
    return this.upsertByUuid(user);
  }

  async update(
    uuid: string,
    updateUserMetadataDto: UpdateUserMetadataDto
  ): Promise<UserMetadata> {
    try {
      const updateUserMetadata = await this.userMetadataModel
        .findOneAndUpdate(
          { uuid },
          { ...updateUserMetadataDto, lastUpdated: new Date() },
          { new: true }
        )
        .exec();

      if (!updateUserMetadata) {
        throw new NotFoundException(`UserMetadata with ID "${uuid}" not found`);
      }

      return updateUserMetadata;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'UserMetadata with this name already exists'
        );
      }
      throw error;
    }
  }

  async findAllPaginated(
    page: number,
    limit: number
  ): Promise<PaginatedUserMetadataDto> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.userMetadataModel
        .find()
        .sort({ _id: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.userMetadataModel.countDocuments().exec(),
    ]);

    const totalPages = Math.max(Math.ceil(total / safeLimit), 1);

    return {
      data: plainToInstance(UserMetadataDto, data),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }

  async remove(uuid: string): Promise<void> {
    const result = await this.userMetadataModel
      .findOneAndDelete({ uuid })
      .exec();
    if (!result) {
      throw new NotFoundException(`UserMetadata with ID "${uuid}" not found`);
    }
  }
}
