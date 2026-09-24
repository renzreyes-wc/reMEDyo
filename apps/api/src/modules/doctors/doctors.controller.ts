import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { DoctorDetail, DoctorSummary, Slot } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { AvailabilityService } from '../availability/availability.service';
import { SlotDto } from '../availability/dto/availability.response';
import { DoctorQueryDto, UpdateDoctorProfileDto } from './dto/doctors.dto';
import { DoctorDetailDto, DoctorSummaryDto } from './dto/doctor.response';
import { DoctorsService } from './doctors.service';

@ApiTags('doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(
    private readonly doctors: DoctorsService,
    private readonly availability: AvailabilityService,
  ) {}

  /** The doctor's own profile. Declared before ':id' so it is not shadowed. */
  @Roles('DOCTOR')
  @ApiOperation({
    summary: 'The calling doctor’s own profile',
    description: 'Includes the fields a public listing omits, such as the license number.',
  })
  @ApiOkResponse({ description: 'The calling doctor’s profile.', type: DoctorDetailDto })
  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<DoctorDetail> {
    return this.doctors.ownProfile(user.id);
  }

  @Roles('DOCTOR')
  @ApiOperation({ summary: 'Update the calling doctor’s profile' })
  @ApiOkResponse({ description: 'The profile as saved.', type: DoctorDetailDto })
  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDoctorProfileDto,
  ): Promise<DoctorDetail> {
    return this.doctors.updateOwnProfile(user.id, dto);
  }

  @ApiOperation({
    summary: 'Search the doctor directory',
    description:
      'Returns approved doctors only. An unapproved doctor is visible to administrators and to themselves, never here.',
  })
  @ApiOkResponse({ description: 'Matching doctors.', type: [DoctorSummaryDto] })
  @Get()
  list(@Query() query: DoctorQueryDto): Promise<DoctorSummary[]> {
    return this.doctors.list(query);
  }

  @ApiOperation({ summary: 'Read one doctor' })
  @ApiParam({ name: 'id', description: 'The doctor profile id, not the user id.' })
  @ApiOkResponse({ description: 'The doctor, with their soonest slots.', type: DoctorDetailDto })
  @Get(':id')
  detail(@Param('id') id: string): Promise<DoctorDetail> {
    return this.doctors.detail(id);
  }

  /** Offerable slots for booking. Approval is enforced by detail() first. */
  @ApiOperation({
    summary: 'Offerable slots for a doctor',
    description:
      'Derived from the doctor’s windows and exceptions. A doctor whose approval is not yet granted returns 404 from the lookup behind this route.',
  })
  @ApiParam({ name: 'id', description: 'The doctor profile id, not the user id.' })
  @ApiOkResponse({ description: 'Currently offerable slots.', type: [SlotDto] })
  @Get(':id/slots')
  async slots(@Param('id') id: string): Promise<Slot[]> {
    await this.doctors.detail(id);
    return this.availability.slotsFor(id);
  }
}
