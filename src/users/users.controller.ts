import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../roles/role.enum';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard,RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
 

@Get()
@Roles(Role.Admin, Role.User)
async getAllUsers() {
  return this.usersService.findAll();  // return actual users list
}

  @Get('profile')
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  async getProfile(@Req() req: any) {
    const {userId} = req.user;
    const user= await this.usersService.findOne(userId);
    return {
      message: "Accessible by all authenticated roles",
      user
    };
  }
}
