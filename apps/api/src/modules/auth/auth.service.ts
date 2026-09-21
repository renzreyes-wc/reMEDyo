import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import { SessionUser } from '@remedyo/shared';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma.service';
import { initialsOf } from '../../common/initials';
import type { AuthUser } from '../../common/types';
import { LoginDto, RegisterDoctorDto, RegisterPatientDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async registerPatient(dto: RegisterPatientDto): Promise<{ token: string; user: SessionUser }> {
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.createUser(Role.PATIENT, dto.email, passwordHash, (tx, userId) =>
      tx.patientProfile.create({
        data: { userId, fullName: dto.fullName?.trim() || null },
      }),
    );

    return { token: await this.sign(user.id, Role.PATIENT), user: await this.sessionUser(user.id) };
  }

  async registerDoctor(dto: RegisterDoctorDto): Promise<{ token: string; user: SessionUser }> {
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.createUser(Role.DOCTOR, dto.email, passwordHash, (tx, userId) =>
      tx.doctorProfile.create({
        data: {
          userId,
          fullName: dto.fullName.trim(),
          specializations: dto.specializations,
          licenseNumber: dto.licenseNumber.trim(),
          yearsExperience: dto.yearsExperience ?? 0,
          bio: dto.bio?.trim() ?? '',
          // Every doctor starts unlisted and unbookable until an admin
          // approves them. The directory spec depends on this default.
          approvalState: 'PENDING',
        },
      }),
    );

    return { token: await this.sign(user.id, Role.DOCTOR), user: await this.sessionUser(user.id) };
  }

  async login(dto: LoginDto): Promise<{ token: string; user: SessionUser }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // One message for both "no such email" and "wrong password", so the
    // response cannot be used to discover which accounts exist.
    const generic = 'That email and password combination is not correct.';

    if (!user) {
      // Hash anyway so a missing account is not detectably faster than a
      // wrong password.
      await argon2.hash(dto.password).catch(() => undefined);
      throw new UnauthorizedException(generic);
    }

    const valid = await argon2.verify(user.passwordHash, dto.password).catch(() => false);
    if (!valid) {
      throw new UnauthorizedException(generic);
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(
        user.status === 'SUSPENDED'
          ? 'This account has been suspended. Please contact the administrator.'
          : 'This account has been deactivated.',
      );
    }

    return { token: await this.sign(user.id, user.role), user: await this.sessionUser(user.id) };
  }

  async sessionUser(userId: string): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: { select: { fullName: true, dateOfBirth: true } },
        doctorProfile: {
          select: { fullName: true, specializations: true, approvalState: true },
        },
      },
    });

    if (!user) throw new NotFoundException('Account not found.');

    const displayName =
      user.patientProfile?.fullName ?? user.doctorProfile?.fullName ?? null;

    // A patient must have a name and date of birth before booking; a doctor
    // needs a name and at least one specialization to be reviewable.
    const profileComplete =
      user.role === 'PATIENT'
        ? Boolean(user.patientProfile?.fullName && user.patientProfile?.dateOfBirth)
        : user.role === 'DOCTOR'
          ? Boolean(user.doctorProfile?.fullName && user.doctorProfile.specializations.length > 0)
          : true;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      displayName,
      initials: initialsOf(displayName) || user.email.slice(0, 2).toUpperCase(),
      profileComplete,
      ...(user.doctorProfile ? { approvalState: user.doctorProfile.approvalState } : {}),
    };
  }

  private async createUser(
    role: Role,
    email: string,
    passwordHash: string,
    createProfile: (tx: Prisma.TransactionClient, userId: string) => Promise<unknown>,
  ): Promise<{ id: string }> {
    const normalised = email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email: normalised } });
    if (existing) {
      throw new ConflictException('An account with that email already exists.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: normalised, passwordHash, role, status: 'ACTIVE' },
          select: { id: true },
        });
        await createProfile(tx, user.id);
        return user;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('An account with that email already exists.');
      }
      throw error;
    }
  }

  private sign(sub: string, role: Role): Promise<string> {
    return this.jwt.signAsync({ sub, role });
  }

  currentUser(user: AuthUser): Promise<SessionUser> {
    return this.sessionUser(user.id);
  }
}
