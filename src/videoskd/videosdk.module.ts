import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { VideoSdkService } from './videosdk.service';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      secret: process.env.VIDEOSDK_SECRET_KEY,
      signOptions: { expiresIn: '120m', algorithm: 'HS256' },
    }),
  ],
  providers: [VideoSdkService],
  exports: [VideoSdkService],
})
export class VideoSdkModule {}
