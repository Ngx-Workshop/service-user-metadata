import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserMetadataDto } from './dto/create.dto';
import { UpdateUserMetadataDto } from './dto/update.dto';
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

  async upsertByUuid(uuid: string): Promise<UserMetadata> {
    return this.userMetadataModel
      .findOneAndUpdate(
        { uuid },
        { $setOnInsert: { uuid } },
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

  async findOne(uuid: string): Promise<UserMetadata> {
    // Fallback: treat provided id as uuid
    const userMetadata = await this.userMetadataModel.findOne({ uuid }).exec();
    if (userMetadata) return userMetadata;

    // Upsert a new record with this uuid if none exists
    return this.upsertByUuid(uuid);
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

  async remove(uuid: string): Promise<void> {
    const result = await this.userMetadataModel
      .findByIdAndDelete({ uuid })
      .exec();
    if (!result) {
      throw new NotFoundException(`UserMetadata with ID "${uuid}" not found`);
    }
  }
}
