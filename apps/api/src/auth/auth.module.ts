import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Module({
  providers: [PasswordService, SessionService],
  exports: [PasswordService, SessionService],
})
export class AuthModule {}
