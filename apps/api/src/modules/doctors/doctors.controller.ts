import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import type { DoctorDetail, DoctorSummary, Slot } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { AvailabilityService } from '../availability/availability.service';
import { DoctorQueryDto, UpdateDoctorProfileDto } from './dto/doctors.dto';
import { DoctorsService } from './doctors.service';

@Controller('doctors')
export class DoctorsController {
  constructor(
    private readonly doctors: DoctorsService,
    private readonly availability: AvailabilityService,
  ) {}

  /** The doctor's own profile. Declared before ':id' so it is not shadowed. */
  @Roles('DOCTOR')
  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<DoctorDetail> {
    return this.doctors.ownProfile(user.id);
  }

  @Roles('DOCTOR')
  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDoctorProfileDto,
  ): Promise<DoctorDetail> {
    return this.doctors.updateOwnProfile(user.id, dto);
  }

  @Get()
  list(@Query() query: DoctorQueryDto): Promise<DoctorSummary[]> {
    return this.doctors.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string): Promise<DoctorDetail> {
    return this.doctors.detail(id);
  }

  /** Offerable slots for booking. Approval is enforced by detail() first. */
  @Get(':id/slots')
  async slots(@Param('id') id: string): Promise<Slot[]> {
    await this.doctors.detail(id);
    return this.availability.slotsFor(id);
  }
}
