import { Module, DynamicModule } from '@nestjs/common';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class MongoDBModule {
  static forRoot(
    dbName: string,
    connectionName?: string,
    options: MongooseModuleOptions = {},
  ): DynamicModule {
    return {
      module: MongoDBModule,
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          connectionName,
          useFactory: async (
            configService: ConfigService,
          ): Promise<MongooseModuleOptions> => ({
            uri: configService.get<string>(`MONGO_${dbName}_URI`),
            ...options,
          }),
        }),
      ],
      exports: [MongooseModule],
    };
  }
}
