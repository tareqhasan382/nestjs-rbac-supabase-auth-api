import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';


@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

 // POST Signup
  @Post("signup")
  async signUp(@Body() signuData:CreateUserDto){}
 // POST Login

 // POST Refresh Token
}
