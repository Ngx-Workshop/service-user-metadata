import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { RemoteAuthGuard } from '@tmdjr/ngx-auth-client';
import { CreateUserMetadataDto, UserMetadataDto } from './dto/create.dto';
import { UpdateUserMetadataDto } from './dto/update.dto';
import { UserMetadataService } from './user-metadata.service';

export class AuthTestDto {
  @ApiProperty()
  message: string;
}

@ApiTags('User Metadata')
@Controller('user-metadata')
export class UserMetadataController {
  constructor(private readonly userMetadataService: UserMetadataService) {}

  @Put(':userId')
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ type: UserMetadataDto })
  async upsertByUserId(
    @Param('userId') userId: string,
    @Body() dto: Partial<CreateUserMetadataDto>
  ) {
    await this.userMetadataService.upsertByUuid(userId);
    // return the current doc (optional): you can fetch and return it if you prefer
    return { userId, ...dto };
  }

  @Post()
  @UseGuards(RemoteAuthGuard)
  @ApiCreatedResponse({ type: CreateUserMetadataDto })
  create(@Body() createUserMetadataDto: CreateUserMetadataDto) {
    return this.userMetadataService.create(createUserMetadataDto);
  }

  @Get(':id')
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ type: UserMetadataDto })
  findOne(@Param('id') id: string) {
    return this.userMetadataService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RemoteAuthGuard)
  @ApiOkResponse({ type: UpdateUserMetadataDto })
  update(
    @Param('id') id: string,
    @Body() updateUserMetadataDto: UpdateUserMetadataDto
  ) {
    return this.userMetadataService.update(id, updateUserMetadataDto);
  }

  @Delete(':id')
  @UseGuards(RemoteAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.userMetadataService.remove(id);
  }
}
