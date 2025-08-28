import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';
import type { Prisma } from '@prisma/client';

type NotificationPrefDTO = {
  id?: string;
  userId: string;
  emailOnComments: boolean;
  emailOnMentions: boolean;
  newsletter: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    try {
      // Hash password unless it appears already hashed (e.g., starts with $2)
      const password = createUserDto.password;
      const hashed =
        password && password.startsWith('$2')
          ? password
          : await bcrypt.hash(password, 10);

      // Build data without using any
      const { role, ...rest } = createUserDto;
      const base = { ...rest, password: hashed };
      const data = typeof role !== 'undefined' ? { ...base, role } : base;

      return await this.prisma.user.create({
        data,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'User with this email or username already exists',
          );
        }
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const { password, ...updateData } = updateUserDto;
      const patch: Prisma.UserUpdateInput = {};
      if (typeof password === 'string' && password.length) {
        patch.password = password.startsWith('$2')
          ? password
          : await bcrypt.hash(password, 10);
      }
      if (typeof updateData.email !== 'undefined')
        patch.email = updateData.email;
      if (typeof updateData.username !== 'undefined')
        patch.username = updateData.username;
      if (typeof updateData.firstName !== 'undefined')
        patch.firstName = updateData.firstName;
      if (typeof updateData.lastName !== 'undefined')
        patch.lastName = updateData.lastName;
      if (typeof updateData.avatar !== 'undefined')
        patch.avatar = updateData.avatar;
      if (typeof updateData.isActive !== 'undefined')
        patch.isActive = updateData.isActive;
      if (typeof updateData.role !== 'undefined') patch.role = updateData.role;

      return await this.prisma.user.update({
        where: { id },
        data: patch,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found');
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found');
        }
      }
      throw error;
    }
  }

  // ---------- Self-service profile methods ----------
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(
    userId: string,
    body: {
      email?: string;
      firstName?: string;
      lastName?: string;
      bio?: string;
      avatar?: string;
    },
  ) {
    try {
      const data: Prisma.UserUpdateInput = {};
      if (typeof body.email !== 'undefined') data.email = body.email;
      if (typeof body.firstName !== 'undefined')
        data.firstName = body.firstName;
      if (typeof body.lastName !== 'undefined') data.lastName = body.lastName;
      if (typeof body.bio !== 'undefined') data.bio = body.bio;
      if (typeof body.avatar !== 'undefined') data.avatar = body.avatar;

      const updated = await this.prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          bio: true,
          avatar: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await this.logActivity(userId, 'profile.update', {
        fields: Object.keys(data),
      });
      return updated;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found');
        }
        if (error.code === 'P2002') {
          throw new ConflictException('Email already in use');
        }
      }
      throw error;
    }
  }

  async changeMyPassword(
    userId: string,
    body: { currentPassword: string; newPassword: string },
  ) {
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('Current and new password are required');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const ok = await bcrypt.compare(body.currentPassword, user.password);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(body.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    await this.logActivity(userId, 'password.change');
    return { message: 'Password updated successfully' };
  }

  async getMyNotifications(userId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (pref) return pref;
    // Return defaults when not set
    const defaults: NotificationPrefDTO = {
      userId,
      emailOnComments: true,
      emailOnMentions: true,
      newsletter: false,
    };
    return defaults;
  }

  async updateMyNotifications(
    userId: string,
    body: {
      emailOnComments?: boolean;
      emailOnMentions?: boolean;
      newsletter?: boolean;
    },
  ) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    const createData = {
      userId,
      emailOnComments:
        body.emailOnComments ?? existing?.emailOnComments ?? true,
      emailOnMentions:
        body.emailOnMentions ?? existing?.emailOnMentions ?? true,
      newsletter: body.newsletter ?? existing?.newsletter ?? false,
    };
    const pref = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        emailOnComments: createData.emailOnComments,
        emailOnMentions: createData.emailOnMentions,
        newsletter: createData.newsletter,
      },
      create: createData,
    });
    await this.logActivity(userId, 'notifications.update', {
      pref: createData,
    });
    return pref;
  }

  async getMyActivity(userId: string) {
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  private async logActivity(
    userId: string,
    action: string,
    metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
  ) {
    try {
      await this.prisma.activityLog.create({
        data: { userId, action, metadata },
      });
    } catch {
      // best-effort; do not throw
    }
  }
}
