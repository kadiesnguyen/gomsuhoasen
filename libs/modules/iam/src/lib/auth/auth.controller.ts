import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, CreateUserDto } from '../dto/auth.dto';
import { Public, CurrentUser, Roles, RolesGuard } from './guards';
import { GHS_CONTROLLERS, GHS_METHODS, USER_ROLE_GROUPS } from '@gomhoasen/contracts';

@Controller(GHS_CONTROLLERS.IAM.AUTH)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post(GHS_METHODS.IAM.LOGIN)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(RolesGuard)
  @Roles(...USER_ROLE_GROUPS.ADMIN_ONLY)
  @Post(GHS_METHODS.IAM.CREATE_USER)
  async createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto.fullName, dto.email, dto.password);
  }

  @Post(GHS_METHODS.IAM.CHANGE_PASSWORD)
  async changePassword(
    @CurrentUser() user: { userId: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get(GHS_METHODS.IAM.ME)
  async me(@CurrentUser() user: { userId: string }) {
    const u = await this.authService.findById(user.userId);
    if (!u) return null;
    return { id: u._id, fullName: u.fullName, email: u.email, role: u.role };
  }
}
