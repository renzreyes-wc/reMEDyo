import { forwardRef, Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

@Module({
  imports: [forwardRef(() => AvailabilityModule)],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
