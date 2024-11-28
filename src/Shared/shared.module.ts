import { DynamicModule, Inject, Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { SharedService } from './shared.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {
  static registerRmq(service: string, queueName: string): DynamicModule {
    const provider = {
      provide: service,
      useFactory: (configService: ConfigService) => {
        const USER = configService.get<string>('RABBITMQ_USER');
        const PASS = configService.get<string>('RABBITMQ_PASS');
        const HOST = configService.get<string>('RABBITMQ_HOST');
        const QUEUE = configService.get<string>(`RABBITMQ_${queueName}_QUEUE`);
        // const URI = configService.get<string>('RABBITMQ_URI');
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [`amqps://${USER}:${PASS}@${HOST}`],
            // urls: [URI],
            queue: QUEUE,
            queueOptions: {
              durable: true,
              
            },
          },
        });
      },
      inject: [ConfigService],
    };
    return {
      module: SharedModule,
      providers: [provider],
      exports: [provider],
    };
  }
}
