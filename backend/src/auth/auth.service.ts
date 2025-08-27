import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  // Simple in-memory brute-force protection per identifier (email)
  private loginAttempts = new Map<
    string,
    { count: number; first: number; blockedUntil?: number }
  >();

  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly BLOCK_MS = 15 * 60 * 1000; // 15 minutes

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });
    return user;
  }

  private recordFailure(key: string) {
    const now = Date.now();
    const current = this.loginAttempts.get(key);
    if (!current) {
      this.loginAttempts.set(key, { count: 1, first: now });
      return;
    }

    // Reset window if expired
    if (now - current.first > this.WINDOW_MS) {
      this.loginAttempts.set(key, { count: 1, first: now });
      return;
    }

    current.count += 1;
    if (current.count >= this.MAX_ATTEMPTS) {
      current.blockedUntil = now + this.BLOCK_MS;
      // reset counters for next window after block
      current.count = 0;
      current.first = now;
    }
    this.loginAttempts.set(key, current);
  }

  private resetAttempts(key: string) {
    this.loginAttempts.delete(key);
  }

  async login(loginDto: LoginDto) {
    const key = (loginDto.email || '').toLowerCase();
    const now = Date.now();
    const record = this.loginAttempts.get(key);
    if (record?.blockedUntil && record.blockedUntil > now) {
      throw new HttpException(
        'Too many login attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.usersService.findByEmail(loginDto.email);

    const isPasswordValid = user
      ? await bcrypt.compare(loginDto.password, user.password)
      : false;
    if (!user || !isPasswordValid) {
      this.recordFailure(key);
      throw new UnauthorizedException('Invalid credentials');
    }

    // success -> clear attempts
    this.resetAttempts(key);

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const remember = !!loginDto.rememberMe;
    const longExp = this.config.get<string>('JWT_REMEMBER_EXPIRATION') || '30d';
    const shortExp = this.config.get<string>('JWT_EXPIRATION') || '1d';

    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: remember ? longExp : shortExp,
      }),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }
}
