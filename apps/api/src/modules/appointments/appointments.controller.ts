import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Appointment } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { AppointmentsService } from './appointments.service';
import { AppointmentDto } from './dto/appointment.response';
import {
  BookAppointmentDto,
  CancelAppointmentDto,
  RescheduleAppointmentDto,
} from './dto/appointments.dto';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @ApiOperation({
    summary: 'List the calling account’s appointments',
    description: 'Scoped to the caller: a patient sees their own, a doctor the ones booked with them.',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['upcoming', 'past', 'all'],
    description: 'Defaults to `all`.',
  })
  @ApiOkResponse({ description: 'The caller’s appointments.', type: [AppointmentDto] })
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('scope') scope?: 'upcoming' | 'past' | 'all',
  ): Promise<Appointment[]> {
    return this.appointments.listForUser(user, scope ?? 'all');
  }

  @ApiOperation({
    summary: 'Read one appointment',
    description: 'Refused unless the caller is one of the two participants.',
  })
  @ApiParam({ name: 'id', description: 'The appointment id.' })
  @ApiOkResponse({ description: 'The appointment.', type: AppointmentDto })
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Appointment> {
    return this.appointments.getForUser(user, id);
  }

  @Roles('PATIENT')
  @ApiOperation({
    summary: 'Book an appointment',
    description: 'The requested slot must be one the doctor currently offers.',
  })
  @ApiCreatedResponse({ description: 'The booked appointment.', type: AppointmentDto })
  @Post()
  book(
    @CurrentUser() user: AuthUser,
    @Body() dto: BookAppointmentDto,
  ): Promise<Appointment> {
    return this.appointments.book(user, dto);
  }

  @Roles('PATIENT')
  @ApiOperation({
    summary: 'Reschedule an appointment',
    description: 'Only the patient may move an appointment, and only before it starts.',
  })
  @ApiParam({ name: 'id', description: 'The appointment id.' })
  @ApiCreatedResponse({ description: 'The appointment at its new time.', type: AppointmentDto })
  @Post(':id/reschedule')
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<Appointment> {
    return this.appointments.reschedule(user, id, dto);
  }

  /**
   * Either participant may cancel. There is no time restriction: the state is
   * what decides, so an appointment whose start has passed can still be
   * cancelled — it is late, not closed.
   */
  @Roles('PATIENT', 'DOCTOR')
  @ApiOperation({
    summary: 'Cancel an appointment',
    description:
      'Either participant may cancel. Refused once the consultation is completed or already cancelled. There is no time restriction — an appointment whose start has passed can still be cancelled.',
  })
  @ApiParam({ name: 'id', description: 'The appointment id.' })
  @ApiCreatedResponse({ description: 'The cancelled appointment.', type: AppointmentDto })
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<Appointment> {
    return this.appointments.cancel(user, id, dto);
  }
}
