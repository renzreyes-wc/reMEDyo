import { forwardRef, Module } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [forwardRef(() => DoctorsModule)],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
