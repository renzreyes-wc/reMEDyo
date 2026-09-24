import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AvailabilityException, AvailabilityWindow, Slot } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { DoctorsService } from '../doctors/doctors.service';
import { AvailabilityService } from './availability.service';
import { CreateExceptionDto, CreateWindowDto } from './dto/availability.dto';
import {
  AvailabilityExceptionDto,
  AvailabilityWindowDto,
  SlotDto,
} from './dto/availability.response';

@ApiTags('availability')
@Roles('DOCTOR')
@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availability: AvailabilityService,
    private readonly doctors: DoctorsService,
  ) {}

  @ApiOperation({
    summary: 'List the doctor\'s weekly windows',
    description: 'Every route here acts on the calling doctor\'s own schedule.',
  })
  @ApiOkResponse({ description: 'The doctor\'s windows.', type: [AvailabilityWindowDto] })
  @Get('windows')
  async windows(@CurrentUser() user: AuthUser): Promise<AvailabilityWindow[]> {
    return this.availability.listWindows(await this.doctors.profileIdFor(user.id));
  }

  @ApiOperation({ summary: 'Add a weekly window' })
  @ApiCreatedResponse({ description: 'The window as stored.', type: AvailabilityWindowDto })
  @Post('windows')
  async addWindow(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWindowDto,
  ): Promise<AvailabilityWindow> {
    return this.availability.addWindow(await this.doctors.profileIdFor(user.id), dto);
  }

  @ApiOperation({ summary: 'Remove a weekly window' })
  @ApiParam({ name: 'id', description: 'The window to remove.' })
  @ApiNoContentResponse({ description: 'The window was removed.' })
  @Delete('windows/:id')
  @HttpCode(204)
  async removeWindow(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.availability.removeWindow(await this.doctors.profileIdFor(user.id), id);
  }

  @ApiOperation({
    summary: 'List dated exceptions',
    description: 'Dates that override the weekly windows entirely.',
  })
  @ApiOkResponse({ description: 'The doctor\'s exceptions.', type: [AvailabilityExceptionDto] })
  @Get('exceptions')
  async exceptions(@CurrentUser() user: AuthUser): Promise<AvailabilityException[]> {
    return this.availability.listExceptions(await this.doctors.profileIdFor(user.id));
  }

  @ApiOperation({ summary: 'Mark a date unavailable' })
  @ApiCreatedResponse({
    description: 'The exception as stored.',
    type: AvailabilityExceptionDto,
  })
  @Post('exceptions')
  async addException(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateExceptionDto,
  ): Promise<AvailabilityException> {
    return this.availability.addException(
      await this.doctors.profileIdFor(user.id),
      dto.date,
      dto.reason,
    );
  }

  @ApiOperation({ summary: 'Remove a dated exception' })
  @ApiParam({ name: 'id', description: 'The exception to remove.' })
  @ApiNoContentResponse({ description: 'The exception was removed.' })
  @Delete('exceptions/:id')
  @HttpCode(204)
  async removeException(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.availability.removeException(await this.doctors.profileIdFor(user.id), id);
  }

  /** The doctor's own derived slots, for previewing their schedule. */
  @ApiOperation({
    summary: 'The doctor\'s own offerable slots',
    description: 'Derived from windows and exceptions, for previewing the schedule.',
  })
  @ApiOkResponse({ description: 'Currently offerable slots.', type: [SlotDto] })
  @Get('slots')
  async slots(@CurrentUser() user: AuthUser): Promise<Slot[]> {
    return this.availability.slotsFor(await this.doctors.profileIdFor(user.id));
  }
}
