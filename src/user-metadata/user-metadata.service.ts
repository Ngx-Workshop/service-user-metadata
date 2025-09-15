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

  async upsertByUserId(userId: string, dto: Partial<CreateUserMetadataDto>) {
    return this.userMetadataModel.updateOne(
      { userId }, // match by FK
      { $setOnInsert: { userId, ...dto, lastUpdated: new Date() } },
      { upsert: true }
    );
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

  async findOne(id: string): Promise<UserMetadata> {
    const userMetadata = await this.userMetadataModel.findById(id).exec();
    if (!userMetadata) {
      throw new NotFoundException(`UserMetadata with ID "${id}" not found`);
    }
    return userMetadata;
  }

  async update(
    id: string,
    updateUserMetadataDto: UpdateUserMetadataDto
  ): Promise<UserMetadata> {
    try {
      const updateUserMetadata = await this.userMetadataModel
        .findByIdAndUpdate(id, updateUserMetadataDto, { new: true })
        .exec();

      if (!updateUserMetadata) {
        throw new NotFoundException(`UserMetadata with ID "${id}" not found`);
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

  async remove(id: string): Promise<void> {
    const result = await this.userMetadataModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`UserMetadata with ID "${id}" not found`);
    }
  }
}
