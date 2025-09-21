import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../roles/role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  @Get()
  @Roles(Role.Admin, Role.SuperAdmin)
  getAllUsers() {
    return 'This route is restricted to Admins and SuperAdmins';
  }

  @Get('profile')
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  getProfile() {
    return 'Accessible by all authenticated roles';
  }
}
