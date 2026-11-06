import {
  assertLocalDatabase,
  localMode,
} from '../local-development/local-development';
import { HttpService } from '@nestjs/axios';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { IActiveUserData, Role } from '@tmdjr/ngx-auth-client';
import { plainToInstance } from 'class-transformer';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { Request } from 'express';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
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
  private readonly baseUrl =
    process.env.AUTH_BASE_URL ?? 'https://auth.ngx-workshop.io';
  private readonly logger = new Logger(UserMetadataService.name);

  constructor(
    @InjectModel(UserMetadata.name)
    private userMetadataModel: Model<UserMetadataDocument>,
    private httpService: HttpService
  ) {}

  async createAccount(
    dto: AdminCreateUserDto,
    request: Request
  ): Promise<UserMetadata> {
    if (localMode()) assertLocalDatabase();
    const authBase = localMode() ? 'http://127.0.0.1:3005' : this.baseUrl;
    let account: { uuid: string; email: string; role: string };
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ uuid: string; email: string; role: string }>(
          `${authBase}/admin/users`,
          {
            email: dto.email.trim().toLowerCase(),
            password: dto.password,
            role: dto.role,
            requestId: dto.requestId,
          },
          {
            timeout: 10000,
            headers: localMode()
              ? {}
              : { Cookie: request.headers.cookie ?? '' },
          }
        )
      );
      account = response.data;
    } catch (error) {
      if (error.response?.status === 409)
        throw new ConflictException(
          'Email or creation request already exists. Retry the original request or use a different email.'
        );
      if ([401, 403].includes(error.response?.status))
        throw new UnauthorizedException(
          'Account creation requires administrator authorization'
        );
      throw new ServiceUnavailableException(
        'Account service unavailable. Retry this creation request; it is safe to retry.'
      );
    }
    if (
      !account?.uuid ||
      account.email !== dto.email.trim().toLowerCase() ||
      account.role !== dto.role
    )
      throw new BadGatewayException(
        'Account service returned an invalid response'
      );
    try {
      return await this.userMetadataModel
        .findOneAndUpdate(
          { uuid: account.uuid },
          {
            $set: {
              email: account.email,
              role: account.role,
              firstName: dto.firstName ?? '',
              lastName: dto.lastName ?? '',
              avatarUrl: dto.avatarUrl ?? '',
              description: dto.description ?? '',
              lastUpdated: new Date(),
            },
            $setOnInsert: { uuid: account.uuid },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            runValidators: true,
          }
        )
        .exec();
    } catch {
      throw new ServiceUnavailableException(
        'Account created, but its profile could not be saved. Retry this same request to finish creating the profile.'
      );
    }
  }

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

  async findOneAdmin(uuid: string): Promise<UserMetadata> {
    const userMetadata = await this.userMetadataModel.findOne({ uuid }).exec();
    if (!userMetadata) {
      throw new NotFoundException(`UserMetadata with ID "${uuid}" not found`);
    }
    return userMetadata;
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
    limit: number,
    query?: string,
    role?: Role
  ): Promise<PaginatedUserMetadataDto> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const filters: Record<string, unknown> = {};
    if (role) {
      filters.role = role;
    }

    if (query?.trim()) {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedQuery, 'i');
      filters.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { uuid: searchRegex },
      ];
    }

    const [data, total] = await Promise.all([
      this.userMetadataModel
        .find(filters)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.userMetadataModel.countDocuments(filters).exec(),
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

  async updateRole(
    userId: string,
    role: string,
    request: Request
  ): Promise<UserMetadata> {
    // Confirm identity-role synchronization before advertising success in metadata.
    // Synthetic seed IDs have no identity; real local accounts use the isolated auth service.
    if (!localMode() || /^[a-f0-9]{24}$/i.test(userId))
      await this.updateUserRole(userId, role, request);
    const updatedUserMetadata = await this.userMetadataModel
      .findOneAndUpdate(
        { uuid: userId },
        { role, lastUpdated: new Date() },
        { new: true }
      )
      .exec();

    if (!updatedUserMetadata) {
      throw new NotFoundException(`UserMetadata with ID "${userId}" not found`);
    }

    return updatedUserMetadata;
  }

  async updateUserRole(
    userId: string,
    role: string,
    request: Request
  ): Promise<void> {
    if (localMode()) {
      assertLocalDatabase();
      if (!/^[a-f0-9]{24}$/i.test(userId)) return;
      try {
        const result = await firstValueFrom(
          this.httpService.put(
            'http://127.0.0.1:3005/role',
            { userId, role },
            { timeout: 10000 }
          )
        );
        if (!result.data) throw new Error('Local account not found');
      } catch {
        throw new ServiceUnavailableException(
          'Unable to update the local sign-in account role. Retry the action.'
        );
      }
      return;
    }
    const accessToken = request.cookies?.accessToken;
    if (!accessToken) {
      throw new UnauthorizedException('No access token found');
    }
    try {
      await firstValueFrom(
        this.httpService.put(
          `${this.baseUrl}/role`,
          { userId, role },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Cookie: `accessToken=${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        )
      );
    } catch (err) {
      this.logger.error(
        `Failed to update user role for user ID: ${userId} to role: ${role}`,
        err instanceof Error ? err.stack : undefined
      );
      throw new InternalServerErrorException('Updateing user role failed');
    }
  }
}
