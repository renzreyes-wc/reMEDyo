import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JWT_EXPIRES_IN } from '@remedyo/shared';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
