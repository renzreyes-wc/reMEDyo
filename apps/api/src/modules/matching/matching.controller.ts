import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { MatchResult, SymptomOption } from '@remedyo/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { MatchingService } from './matching.service';
import { MatchIntakeDto } from './dto/matching.dto';
import { MatchResultDto, SymptomOptionDto } from './dto/matching.response';

@ApiTags('matching')
@Roles('PATIENT')
@Controller('matching')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @ApiOperation({
    summary: 'The symptom catalogue',
    description: 'The options the intake form offers, including which ones are emergency indicators.',
  })
  @ApiOkResponse({ description: 'Every symptom the rules recognise.', type: [SymptomOptionDto] })
  @Get('symptoms')
  catalogue(): Promise<SymptomOption[]> {
    return this.matching.catalogue();
  }

  @ApiOperation({
    summary: 'Matching doctors for a described concern',
    description:
      'Deterministic: the same intake always produces the same result, so a patient who retries does not get a different answer. A rule that matches nothing falls back rather than returning an empty list.',
  })
  @ApiOkResponse({ description: 'Suggestions, with any emergency warning.', type: MatchResultDto })
  @HttpCode(200)
  @Post()
  match(@Body() dto: MatchIntakeDto): Promise<MatchResult> {
    return this.matching.match({
      symptomIds: dto.symptomIds ?? [],
      freeText: dto.freeText,
      durationDays: dto.durationDays,
      severity: dto.severity,
    });
  }
}
