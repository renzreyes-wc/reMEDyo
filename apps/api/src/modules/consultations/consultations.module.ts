import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';

@Module({
  imports: [AppointmentsModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
