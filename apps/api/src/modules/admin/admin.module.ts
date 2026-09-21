import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AppointmentsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
