import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { ConsultationContext, ConsultationMessage } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { ConsultationsService } from './consultations.service';
import { SendMessageDto } from './dto/consultations.dto';
import {
  ConsultationContextDto,
  ConsultationMessageDto,
} from './dto/consultations.response';

@ApiTags('consultations')
@Roles('PATIENT', 'DOCTOR')
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultations: ConsultationsService) {}

  @ApiOperation({
    summary: 'The state of a consultation',
    description:
      'Every route here is scoped to an appointment the caller is a participant in. The clinical context is returned to the doctor only.',
  })
  @ApiParam({ name: 'appointmentId', description: 'The appointment the consultation belongs to.' })
  @ApiOkResponse({
    description: 'The appointment, its session state, and the thread so far.',
    type: ConsultationContextDto,
  })
  @Get(':appointmentId')
  context(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<ConsultationContext> {
    return this.consultations.context(user, appointmentId);
  }

  @ApiOperation({
    summary: 'Join the consultation',
    description:
      'Records the caller’s arrival. Whether joining is allowed is decided by the appointment’s state, not by the clock: a participant who is early or late still belongs in this room. Refused once the consultation has completed or the appointment was cancelled.',
  })
  @ApiParam({ name: 'appointmentId', description: 'The appointment the consultation belongs to.' })
  @ApiOkResponse({ description: 'The consultation, updated with this caller’s arrival.', type: ConsultationContextDto })
  @Post(':appointmentId/join')
  join(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<ConsultationContext> {
    return this.consultations.join(user, appointmentId);
  }

  @Roles('DOCTOR')
  @ApiOperation({
    summary: 'Complete the consultation',
    description:
      'The doctor ends the session. A patient cannot close a consultation, and a doctor who did not take part cannot either.',
  })
  @ApiParam({ name: 'appointmentId', description: 'The appointment the consultation belongs to.' })
  @ApiOkResponse({ description: 'The consultation, now completed.', type: ConsultationContextDto })
  @Post(':appointmentId/complete')
  complete(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<ConsultationContext> {
    return this.consultations.complete(user, appointmentId);
  }

  @ApiOperation({
    summary: 'Post a message',
    description: 'Both participants may write. Messages are retained with the record.',
  })
  @ApiParam({ name: 'appointmentId', description: 'The appointment the consultation belongs to.' })
  @ApiCreatedResponse({ description: 'The stored message.', type: ConsultationMessageDto })
  @Post(':appointmentId/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: SendMessageDto,
  ): Promise<ConsultationMessage> {
    return this.consultations.sendMessage(user, appointmentId, dto.body);
  }
}
