import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ConsultationsModule } from '../consultations/consultations.module';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { DraftService } from './draft.service';
import { SummaryService } from './summary.service';

@Module({
  imports: [AppointmentsModule, ConsultationsModule],
  controllers: [RecordsController],
  providers: [RecordsService, SummaryService, DraftService],
  exports: [RecordsService],
})
export class RecordsModule {}
