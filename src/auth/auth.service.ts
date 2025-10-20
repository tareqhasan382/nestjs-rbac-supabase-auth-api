import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
// import * as csv from 'fast-csv';
// import { plainToInstance } from 'class-transformer';
// import { Buffer } from 'buffer';


@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}


  async register(createUserDto: CreateUserDto) {
      const existingUser = await this.userService.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }
    return this.userService.create(createUserDto);
    // remove sensitive fields
    // if (created.password) delete created.password;
   // return created;
  }
// bulk post
  async bulkRegister(createUserDtos: CreateUserDto[]) {
    const total = createUserDtos.length;
    const failedRows: Array<{ rowIndex: number; row: any; reasons: string[] }> = [];
    if (total === 0) {
      return { total: 0, createdCount: 0, failedRows };
    }
    // 1) Normalize emails and detect duplicate emails
    const seen = new Map<string, number>(); // normalized email -> first index (0-based)
    const candidates: Array<{ dto: CreateUserDto; normalizedEmail: string; originalIndex: number }> = [];

    createUserDtos.forEach((raw, idx) => {
      const rawEmail = (raw.email ?? '').toString().trim();
      const normalized = rawEmail.toLowerCase();
      if (!rawEmail) {
        failedRows.push({ rowIndex: idx + 1, row: raw, reasons: ['Missing email'] });
        return;
      }

      if (!seen.has(normalized)) {
        seen.set(normalized, idx);
        // create a shallow copy and overwrite email with normalized value to keep consistent
        candidates.push({
          dto: { ...raw, email: normalized },
          normalizedEmail: normalized,
          originalIndex: idx,
        });
      } else {
        const firstIdx = seen.get(normalized)!;
        failedRows.push({
          rowIndex: idx + 1,
          row: raw,
          reasons: [`Duplicate email in payload (duplicate of row ${firstIdx + 1})`],
        });
      }
    });

    // 2) Query DB once for existing emails among candidates
    const emailsToCheck = candidates.map((c) => c.normalizedEmail);
    const existingUsers = emailsToCheck.length
      ? await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(user.email) IN (:...emails)', { emails: emailsToCheck })
        .select(['user.email'])
        .getMany()
      : [];
    const existingSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    // 3) Build final insert list (skip rows that exist in DB)
    const toInsert: Array<{ dto: CreateUserDto; originalIndex: number }> = [];
    for (const c of candidates) {
      if (existingSet.has(c.normalizedEmail)) {
        failedRows.push({
          rowIndex: c.originalIndex + 1,
          row: c.dto,
          reasons: ['Email already exists in system'],
        });
        continue;
      }
      toInsert.push({ dto: c.dto, originalIndex: c.originalIndex });
    }

    // 4) Hash passwords and prepare raw objects for insert
    const inserts: Array<Partial<User>> = [];
    for (const item of toInsert) {
      // you might want to enforce stronger password rules here
      const hashed = await bcrypt.hash(item.dto.password, 10);
      inserts.push({
        name: item.dto.name,
        email: item.dto.email,
        password: hashed,
        role: item.dto.role ?? 'user',
        // add defaults for other required columns (e.g. isActive: true)
      });
    }

    // 5) Insert in batches for performance (use repository.insert for speed)
    const batchSize = 200;
    let createdCount = 0;
    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize);
      try {
        // repository.insert bypasses entity lifecycle hooks but is fast
         await this.userRepository.insert(batch);

        createdCount += batch.length;
      } catch (err) {
        console.error(err);

        const start = i;
        for (let j = 0; j < batch.length; j++) {
          const originalIndex = toInsert[start + j]?.originalIndex ?? -1;
          failedRows.push({
            rowIndex: originalIndex + 1,
            row: batch[j],
            reasons: ['Database error during insert'],
          });
        }
      }
    }

    // 6) Final response
    return {
      total,
      createdCount,
      failedRows,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  login(user: any) {
    const payload = { userId: user.id, email: user.email,id:user.id,role:user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h',
    });

    return accessToken;
  }


}