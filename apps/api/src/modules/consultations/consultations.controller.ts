import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { ConsultationContext, ConsultationMessage } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { ConsultationsService } from './consultations.service';

class SendMessageDto {
  @IsString()
  @MinLength(1, { message: 'Write something first.' })
  @MaxLength(2000)
  body!: string;
}

@Roles('PATIENT', 'DOCTOR')
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultations: ConsultationsService) {}

  @Get(':appointmentId')
  context(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<ConsultationContext> {
    return this.consultations.context(user, appointmentId);
  }

  @Post(':appointmentId/join')
  join(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<ConsultationContext> {
    return this.consultations.join(user, appointmentId);
  }

  @Roles('DOCTOR')
  @Post(':appointmentId/complete')
  complete(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<ConsultationContext> {
    return this.consultations.complete(user, appointmentId);
  }

  @Post(':appointmentId/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: SendMessageDto,
  ): Promise<ConsultationMessage> {
    return this.consultations.sendMessage(user, appointmentId, dto.body);
  }
}
