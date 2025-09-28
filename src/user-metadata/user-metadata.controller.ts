import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
  Put,
  Query,
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
} from '@tmdjr/ngx-auth-client';
import {
  CreateUserMetadataDto,
  PaginatedUserMetadataDto,
  PaginationQueryDto,
  UpdateUserMetadataDto,
  UserMetadataDto,
} from './dto/user-metadata.dto';
import { UserMetadataService } from './user-metadata.service';

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
    await this.userMetadataService.upsertByUuid(user.sub);
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
    return this.userMetadataService.findOne(user.sub);
  }

  @Get('all')
  @UseGuards(RemoteAuthGuard)
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

  @Patch()
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ type: UpdateUserMetadataDto })
  update(
    @ActiveUser() user: IActiveUserData,
    @Body() updateUserMetadataDto: UpdateUserMetadataDto
  ) {
    return this.userMetadataService.update(user.sub, updateUserMetadataDto);
  }

  @Delete()
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@ActiveUser() user: IActiveUserData) {
    return this.userMetadataService.remove(user.sub);
  }
}
