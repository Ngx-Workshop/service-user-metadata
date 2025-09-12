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
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiCreatedResponse({ type: CreateUserMetadataDto })
  create(@Body() createUserMetadataDto: CreateUserMetadataDto) {
    return this.userMetadataService.create(createUserMetadataDto);
  }

  @Get(':id')
  @ApiOkResponse({ type: UserMetadataDto })
  findOne(@Param('id') id: string) {
    return this.userMetadataService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: UpdateUserMetadataDto })
  update(
    @Param('id') id: string,
    @Body() updateUserMetadataDto: UpdateUserMetadataDto
  ) {
    return this.userMetadataService.update(id, updateUserMetadataDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.userMetadataService.remove(id);
  }
}
