import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ActiveUser,
  IActiveUserData,
  RemoteAuthGuard,
  Role,
  Roles,
} from '@tmdjr/ngx-auth-client';
import { IsEnum } from 'class-validator';
import {
  CreateUserMetadataDto,
  PaginatedUserMetadataDto,
  PaginationQueryDto,
  UpdateUserMetadataDto,
  UserMetadataDto,
} from './dto/user-metadata.dto';
import { UserMetadataService } from './user-metadata.service';

export class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}

@ApiTags('User Metadata')
@Controller('user-metadata')
export class UserMetadataController {
  private readonly logger = new Logger(UserMetadataController.name);

  constructor(private readonly userMetadataService: UserMetadataService) {}

  @Put()
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ type: UserMetadataDto })
  async upsertByUserId(
    @ActiveUser() user: IActiveUserData,
    @Body() dto: Partial<CreateUserMetadataDto>
  ) {
    await this.userMetadataService.upsertByUuid(user);
    this.logger.log(`Upserted user metadata for user ID: ${user.sub}`);
    return { user, ...dto };
  }

  @Post()
  @UseGuards(RemoteAuthGuard)
  @ApiCreatedResponse({ type: CreateUserMetadataDto })
  create(@Body() createUserMetadataDto: CreateUserMetadataDto) {
    return this.userMetadataService.create(createUserMetadataDto);
  }

  @Get()
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ type: UserMetadataDto })
  findOne(@ActiveUser() user: IActiveUserData) {
    this.logger.log(`Fetching user metadata for user ID: ${user.sub}`);
    return this.userMetadataService.findOne(user);
  }

  @Get('all')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: PaginatedUserMetadataDto })
  findAll(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    )
    paginationQuery: PaginationQueryDto
  ) {
    const { page, limit } = paginationQuery;
    this.logger.log(
      `Fetching paginated user metadata with page=${page}, limit=${limit}`
    );
    return this.userMetadataService.findAllPaginated(page, limit);
  }

  @Patch(':userId/role')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: UpdateUserMetadataDto })
  updateRole(
    @Param('userId') userId: string,
    @Body(new ValidationPipe({ whitelist: true }))
    dto: UpdateRoleDto,
    @Request() request
  ) {
    this.logger.log(
      `Updating role for user ID: ${userId} to role: ${dto.role}`
    );
    return this.userMetadataService.updateRole(userId, dto.role, request);
  }

  @Patch()
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ type: UpdateUserMetadataDto })
  update(
    @ActiveUser() user: IActiveUserData,
    @Body() updateUserMetadataDto: UpdateUserMetadataDto
  ) {
    return this.userMetadataService.update(user.sub, updateUserMetadataDto);
  }

  @Delete(':userId')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('userId') userId: string) {
    return this.userMetadataService.remove(userId);
  }
}
