import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { AvailabilityException, AvailabilityWindow, Slot } from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { DoctorsService } from '../doctors/doctors.service';
import { AvailabilityService } from './availability.service';

class CreateWindowDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(6) dayOfWeek!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(1439) startMinute!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(1440) endMinute!: number;
}

class CreateExceptionDto {
  @IsString() date!: string;
  @IsOptional() @IsString() @MaxLength(200) reason?: string;
}

@Roles('DOCTOR')
@Controller('availability')
export class AvailabilityController {
  constructor(
    private readonly availability: AvailabilityService,
    private readonly doctors: DoctorsService,
  ) {}

  @Get('windows')
  async windows(@CurrentUser() user: AuthUser): Promise<AvailabilityWindow[]> {
    return this.availability.listWindows(await this.doctors.profileIdFor(user.id));
  }

  @Post('windows')
  async addWindow(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWindowDto,
  ): Promise<AvailabilityWindow> {
    return this.availability.addWindow(await this.doctors.profileIdFor(user.id), dto);
  }

  @Delete('windows/:id')
  @HttpCode(204)
  async removeWindow(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.availability.removeWindow(await this.doctors.profileIdFor(user.id), id);
  }

  @Get('exceptions')
  async exceptions(@CurrentUser() user: AuthUser): Promise<AvailabilityException[]> {
    return this.availability.listExceptions(await this.doctors.profileIdFor(user.id));
  }

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

  @Delete('exceptions/:id')
  @HttpCode(204)
  async removeException(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.availability.removeException(await this.doctors.profileIdFor(user.id), id);
  }

  /** The doctor's own derived slots, for previewing their schedule. */
  @Get('slots')
  async slots(@CurrentUser() user: AuthUser): Promise<Slot[]> {
    return this.availability.slotsFor(await this.doctors.profileIdFor(user.id));
  }
}
