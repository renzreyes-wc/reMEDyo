import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Severity, type MatchResult, type SymptomOption } from '@remedyo/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { MatchingService } from './matching.service';

class MatchIntakeDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  symptomIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  freeText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  durationDays?: number;

  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;
}

@Roles('PATIENT')
@Controller('matching')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get('symptoms')
  catalogue(): Promise<SymptomOption[]> {
    return this.matching.catalogue();
  }

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
