import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';
import { SharedServiceInterface } from '../interfaces/shared.service.interface';

@Injectable()
export class SharedService implements SharedServiceInterface {
  constructor(private readonly configService: ConfigService) {}

  getRmqOptions(queueName: string): RmqOptions {
    const USER = this.configService.get<string>('RABBITMQ_USER');
    const PASS = this.configService.get<string>('RABBITMQ_PASS');
    const HOST = this.configService.get<string>('RABBITMQ_HOST');
    const QUEUE = this.configService.get<string>(`RABBITMQ_${queueName}_QUEUE`);
    // const URI = this.configService.get<string>('RABBITMQ_URI');

    return {
      transport: Transport.RMQ,
      options: {
        urls: [`amqps://${USER}:${PASS}@${HOST}`],
        // urls: [`amqp://${USER}:${PASS}@${HOST}`],
        // urls: [URI],
        queue: QUEUE,
        noAck: false,
        persistent: true,
        queueOptions: {
          durable: true,
        },
      },
    };
  }
  acknowledgeMessage(context: RmqContext): void {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.ack(message);
  }

  nacknowledgeMessage(context: RmqContext): void {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.nack(message);
  }
}
