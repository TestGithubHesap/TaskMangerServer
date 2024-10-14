import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { EmailModule } from 'src/email/email.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  PasswordReset,
  PasswordResetSchema,
} from 'src/schemas/passwordReset.schema';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '45m' },
      }),
      inject: [ConfigService],
    }),
    EmailModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PasswordReset.name, schema: PasswordResetSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthResolver],
})
export class AuthModule {}
