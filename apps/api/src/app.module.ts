import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { MatchingModule } from './modules/matching/matching.module';
import { RecordsModule } from './modules/records/records.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AvailabilityModule,
    DoctorsModule,
    AppointmentsModule,
    ConsultationsModule,
    RecordsModule,
    MatchingModule,
    AdminModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [
    // Authentication is applied globally and opted out of with @Public(),
    // so a newly added controller is protected by default rather than
    // accidentally open.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
