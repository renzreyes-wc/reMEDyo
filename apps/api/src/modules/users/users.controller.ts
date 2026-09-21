import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { MedicalHistoryEntry, PatientProfile } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { AddHistoryEntryDto, UpdatePatientProfileDto } from './dto/profile.dto';
import { UsersService } from './users.service';

@Roles('PATIENT')
@Controller('patients/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('profile')
  profile(@CurrentUser() user: AuthUser): Promise<PatientProfile> {
    return this.users.patientProfile(user.id);
  }

  @Patch('profile')
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePatientProfileDto,
  ): Promise<PatientProfile> {
    return this.users.updatePatientProfile(user.id, dto);
  }

  @Post('history')
  addHistory(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddHistoryEntryDto,
  ): Promise<MedicalHistoryEntry> {
    return this.users.addHistoryEntry(user.id, dto);
  }

  @Delete('history/:id')
  @HttpCode(204)
  removeHistory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.users.removeHistoryEntry(user.id, id);
  }
}
