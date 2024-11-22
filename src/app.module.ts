import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

import { GraphQLModule } from '@nestjs/graphql';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import { PubSubModule } from './modules/pubSub.module';
import { MongoDBModule } from './modules/mongodb.module';
import { parseCookies } from './utils/parseCookies';
import { CompanyModule } from './company/company.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    PubSubModule,
    MongoDBModule.forRoot('TASK'),
    GraphQLModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      driver: ApolloDriver,
      useFactory: async (configService: ConfigService) => ({
        playground: true,
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        uploads: false,

        context: ({ req, res, connection }) => {
          if (connection) {
            return { req: connection.context, res };
          }
          return { req, res };
        },
        subscriptions: {
          'subscriptions-transport-ws': {
            onConnect: (connectionParams, webSocket, context) => {
              const cookieString = webSocket.upgradeReq.headers.cookie || '';
              const cookies = parseCookies(cookieString);

              if (Object.keys(cookies).length > 0) {
                return {
                  req: {
                    cookies: cookies,
                  },
                };
              }
              throw new Error('Missing auth token!');
            },
          },
        },
      }),
    }),
    CompanyModule,
    ProjectModule,
    TaskModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
