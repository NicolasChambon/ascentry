import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { SessionGuard } from './session.guard';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [PasswordService, SessionService, SessionGuard],
  exports: [PasswordService, SessionService, SessionGuard],
})
export class AuthModule {}
