import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { MedicalHistoryEntry, PatientProfile } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { AddHistoryEntryDto, UpdatePatientProfileDto } from './dto/profile.dto';
import { MedicalHistoryEntryDto, PatientProfileDto } from './dto/profile.response';
import { UsersService } from './users.service';

@ApiTags('users')
@Roles('PATIENT')
@Controller('patients/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiOperation({
    summary: 'Read the calling patient’s profile',
    description: 'Acts on the caller’s own profile only; the id is taken from the session.',
  })
  @ApiOkResponse({ description: 'The caller’s profile.', type: PatientProfileDto })
  @Get('profile')
  profile(@CurrentUser() user: AuthUser): Promise<PatientProfile> {
    return this.users.patientProfile(user.id);
  }

  @ApiOperation({ summary: 'Update the calling patient’s profile' })
  @ApiOkResponse({ description: 'The profile as saved.', type: PatientProfileDto })
  @Patch('profile')
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePatientProfileDto,
  ): Promise<PatientProfile> {
    return this.users.updatePatientProfile(user.id, dto);
  }

  @ApiOperation({
    summary: 'Add a medical history entry',
    description: 'An allergy, a current medication, a chronic condition, or a free note.',
  })
  @ApiCreatedResponse({ description: 'The entry as recorded.', type: MedicalHistoryEntryDto })
  @Post('history')
  addHistory(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddHistoryEntryDto,
  ): Promise<MedicalHistoryEntry> {
    return this.users.addHistoryEntry(user.id, dto);
  }

  @ApiOperation({ summary: 'Remove a medical history entry' })
  @ApiParam({ name: 'id', description: 'The history entry to remove.' })
  @ApiNoContentResponse({ description: 'The entry was removed.' })
  @Delete('history/:id')
  @HttpCode(204)
  removeHistory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.users.removeHistoryEntry(user.id, id);
  }
}
