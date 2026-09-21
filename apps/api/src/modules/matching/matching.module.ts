import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

@Module({
  imports: [AvailabilityModule, DoctorsModule],
  controllers: [MatchingController],
  providers: [MatchingService],
})
export class MatchingModule {}
