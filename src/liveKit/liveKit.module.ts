import { Module } from '@nestjs/common';
import { LivekitService } from './liveKit.service';

@Module({
  providers: [LivekitService],
  exports: [LivekitService],
})
export class LivekitModule {}
