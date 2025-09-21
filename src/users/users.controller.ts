import { Controller, Get, UseGuards } from '@nestjs/common';
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
  getProfile() {
    return 'Accessible by all authenticated roles';
  }
}
