import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
  Post,
  Query,
  Request,
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
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { UserMetadataService } from './user-metadata.service';
import type { Request as ExpressRequest } from 'express';

@ApiTags('User Metadata')
@Controller('user-metadata')
export class UserMetadataController {
  constructor(private readonly userMetadataService: UserMetadataService) {}

  @Post('admin/users')
  @Roles(Role.Admin)
  @ApiCreatedResponse({ type: UserMetadataDto })
  createUser(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: AdminCreateUserDto,
    @Request() request: ExpressRequest
  ) {
    return this.userMetadataService.createAccount(dto, request);
  }

  @Put()
  @ApiOkResponse({ description: 'User metadata upserted successfully' })
  @HttpCode(HttpStatus.OK)
  async upsertByUserId(@ActiveUser() user: IActiveUserData) {
    await this.userMetadataService.upsertByUuid(user);
  }

  @Get()
  @ApiOkResponse({ type: UserMetadataDto })
  findOne(@ActiveUser() user: IActiveUserData) {
    return this.userMetadataService.findOne(user);
  }

  @Get(':userId/find-one')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: UserMetadataDto })
  findOneAdmin(@Param('userId') userId: string) {
    return this.userMetadataService.findOneAdmin(userId);
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
    return this.userMetadataService.findAllPaginated(page, limit, query, role);
  }

  @Patch(':userId/role')
  @Roles(Role.Admin)
  @ApiOkResponse({ type: UpdateUserMetadataDto })
  updateRole(
    @Param('userId') userId: string,
    @Body(new ValidationPipe({ whitelist: true }))
    dto: UpdateRoleDto,
    @Request() request: ExpressRequest
  ) {
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
    return this.userMetadataService.update(userId, updateUserMetadataDto);
  }

  @Patch()
  @ApiOkResponse({ type: UpdateUserMetadataDto })
  update(
    @ActiveUser() user: IActiveUserData,
    @Body() updateUserMetadataDto: UpdateUserMetadataDto
  ) {
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
