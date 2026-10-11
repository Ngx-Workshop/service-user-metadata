import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ActiveUser, IActiveUserData } from '@tmdjr/ngx-auth-client';
import { Request } from 'express';
import {
  DemoAssessmentDto,
  WorkshopProgressDto,
  WorkshopReadingDto,
} from './workshop-progress.dto';
import { WorkshopProgressService } from './workshop-progress.service';

export class DemoAssessmentResultDto {
  @ApiProperty() correct: boolean;
  @ApiProperty({ type: WorkshopProgressDto }) catalog: WorkshopProgressDto;
}
@ApiTags('Workshop Progress')
@Controller('user-metadata/workshop-progress')
export class WorkshopProgressController {
  constructor(private readonly service: WorkshopProgressService) {}
  @Get()
  @ApiOkResponse({ type: WorkshopProgressDto })
  catalog(@ActiveUser() user: IActiveUserData, @Req() request: Request) {
    return this.service.catalog(user.sub, request);
  }
  @HttpCode(200)
  @Post('workshops/:id/start')
  @ApiOkResponse({ type: WorkshopProgressDto })
  start(
    @ActiveUser() user: IActiveUserData,
    @Param('id') id: string,
    @Req() request: Request
  ) {
    return this.service.start(user.sub, id, request);
  }
  @HttpCode(200)
  @Post('workshops/:id/complete')
  @ApiOkResponse({ type: WorkshopProgressDto })
  complete(
    @ActiveUser() user: IActiveUserData,
    @Param('id') id: string,
    @Req() request: Request
  ) {
    return this.service.complete(user.sub, id, request);
  }
  @Get('workshops/:id/pages/:pageId')
  @ApiOkResponse({ type: WorkshopReadingDto })
  page(
    @ActiveUser() user: IActiveUserData,
    @Param('id') id: string,
    @Param('pageId') pageId: string,
    @Req() request: Request
  ) {
    return this.service.page(user.sub, id, pageId, request);
  }
  @HttpCode(200)
  @Post('workshops/:id/pages/:pageId/seen')
  @ApiOkResponse({ type: WorkshopProgressDto })
  seen(
    @ActiveUser() user: IActiveUserData,
    @Param('id') id: string,
    @Param('pageId') pageId: string,
    @Req() request: Request
  ) {
    return this.service.seen(user.sub, id, pageId, request);
  }
  @HttpCode(200)
  @Post('example-reset')
  @ApiOkResponse({ type: WorkshopProgressDto })
  resetExample(@ActiveUser() user: IActiveUserData) {
    return this.service.resetExample(user.sub);
  }
  @HttpCode(200)
  @Post('example-workshop-assessments/:testId')
  @ApiOkResponse({ type: DemoAssessmentResultDto })
  sampleWorkshopAssessment(
    @ActiveUser() user: IActiveUserData,
    @Param('testId') testId: string,
    @Body() body: DemoAssessmentDto,
    @Req() request: Request
  ) {
    return this.service.sampleWorkshopAssessment(
      user.sub,
      testId,
      body.answer,
      request
    );
  }
  @HttpCode(200)
  @Post('example-assessments/:sectionId')
  @ApiOkResponse({ type: DemoAssessmentResultDto })
  sampleAssessment(
    @ActiveUser() user: IActiveUserData,
    @Param('sectionId') sectionId: string,
    @Body() body: DemoAssessmentDto,
    @Req() request: Request
  ) {
    return this.service.sampleAssessment(
      user.sub,
      sectionId,
      body.answer,
      request
    );
  }
}
