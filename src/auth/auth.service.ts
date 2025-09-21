import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';


@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}


  async register(createUserDto: CreateUserDto) {
      const existingUser = await this.userService.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }
    return this.userService.create(createUserDto);
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    console.log("user---------->",user)
    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(user: any) {
    const payload = { userId: user.id, email: user.email,id:user.id,role:user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h',
    });

    // const refreshToken = this.jwtService.sign(payload, {
    //   secret: process.env.JWT_REFRESH_SECRET,
    //   expiresIn: '7d',
    // });

    // const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    // await this.userService.updateRefreshToken(user.id, hashedRefresh);

    return accessToken  //{ accessToken, refreshToken };
  }

  
}