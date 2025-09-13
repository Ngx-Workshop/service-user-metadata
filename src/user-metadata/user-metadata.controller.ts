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

@ApiTags('Example Crud')
@Controller('example-crud')
export class UserMetadataController {
  constructor(private readonly userMetadataService: UserMetadataService) {}

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
