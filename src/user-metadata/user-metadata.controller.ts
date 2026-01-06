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
  Put,
  Query,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  ActiveUser,
  IActiveUserData,
  Role,
  Roles,
} from '@tmdjr/ngx-auth-client';
import {
  PaginatedUserMetadataDto,
  SearchUserMetadataQueryDto,
  UpdateRoleDto,
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
  @ApiOkResponse({ description: 'User metadata upserted successfully' })
  @HttpCode(HttpStatus.OK)
  async upsertByUserId(@ActiveUser() user: IActiveUserData) {
    await this.userMetadataService.upsertByUuid(user);
    this.logger.log(`Upserted user metadata for user ID: ${user.sub}`);
  }

  @Get()
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
    paginationQuery: SearchUserMetadataQueryDto
  ) {
    const { page, limit, query, role } = paginationQuery;
    this.logger.log(
      `Fetching paginated user metadata with page=${page}, limit=${limit}, query="${
        query ?? ''
      }", role=${role ?? 'any'}`
    );
    return this.userMetadataService.findAllPaginated(page, limit, query, role);
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

  @Patch(':userId/admin-override')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: UpdateUserMetadataDto })
  updateUserMetadataRole(
    @Param('userId') userId: string,
    @Body(new ValidationPipe({ whitelist: true }))
    updateUserMetadataDto: UpdateUserMetadataDto
  ) {
    this.logger.log(`Admin is updating user metadata for user ID: ${userId}`);
    return this.userMetadataService.update(userId, updateUserMetadataDto);
  }

  @Patch()
  @ApiOkResponse({ type: UpdateUserMetadataDto })
  update(
    @ActiveUser() user: IActiveUserData,
    @Body() updateUserMetadataDto: UpdateUserMetadataDto
  ) {
    this.logger.log(`User is updating user metadata for user ID: ${user.sub}`);
    return this.userMetadataService.update(user.sub, updateUserMetadataDto);
  }

  @Delete(':userId')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('userId') userId: string) {
    return this.userMetadataService.remove(userId);
  }
}
