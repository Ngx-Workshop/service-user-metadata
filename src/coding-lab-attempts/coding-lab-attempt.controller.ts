import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ActiveUser, IActiveUserData } from '@tmdjr/ngx-auth-client';
import { Request } from 'express';
import { CodingLabAttemptService } from './coding-lab-attempt.service';
import {
  LabAttemptDto,
  SaveLabAttemptDto,
  StartLabAttemptDto,
  SubmitLabAttemptDto,
} from './coding-lab-attempt.dto';
function validId(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id))
    throw new BadRequestException('Invalid attempt identifier');
  return id;
}
@ApiTags('Coding lab attempts')
@Controller('user-metadata/coding-lab-attempts')
export class CodingLabAttemptController {
  constructor(private readonly service: CodingLabAttemptService) {}
  @Get()
  @ApiOkResponse({ type: [LabAttemptDto] })
  history(@ActiveUser() user: IActiveUserData) {
    return this.service.history(user.sub);
  }
  @Post()
  @HttpCode(200)
  @ApiOkResponse({ type: LabAttemptDto })
  start(
    @ActiveUser() user: IActiveUserData,
    @Body() body: StartLabAttemptDto,
    @Req() request: Request
  ) {
    return this.service.start(user.sub, body, request);
  }
  @Get(':id')
  @ApiOkResponse({ type: LabAttemptDto })
  get(@ActiveUser() user: IActiveUserData, @Param('id') id: string) {
    return this.service.get(user.sub, validId(id));
  }
  @Patch(':id')
  @ApiOkResponse({ type: LabAttemptDto })
  save(
    @ActiveUser() user: IActiveUserData,
    @Param('id') id: string,
    @Body() body: SaveLabAttemptDto
  ) {
    return this.service.save(user.sub, validId(id), body);
  }
  @Post(':id/submit')
  @HttpCode(200)
  @ApiOkResponse({ type: LabAttemptDto })
  submit(
    @ActiveUser() user: IActiveUserData,
    @Param('id') id: string,
    @Body() body: SubmitLabAttemptDto,
    @Req() request: Request
  ) {
    return this.service.submit(user.sub, validId(id), body, request);
  }
}
