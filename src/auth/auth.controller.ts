import { Controller, Post, Body, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';


@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

 
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const result = await this.authService.register(createUserDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'User created successfully',
      data: result,
    };
  }


  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    const token = await this.authService.login(user);
    return {
      statusCode: HttpStatus.OK,
      message: 'User logged in successfully',
      data: {
        accessToken: token,
      },
    };
  }



  
  @UseGuards(JwtAuthGuard)
  @Post('protected')
  async protectedRoute(@Req() req) {
    return { message: 'You have access', user: req.user };
  }
}

