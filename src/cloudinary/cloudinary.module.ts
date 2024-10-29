import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { CloudinaryProvider } from 'src/common/provider/cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryProvider, CloudinaryService],
})
export class CloudinaryModule {}
