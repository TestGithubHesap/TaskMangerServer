import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { GraphQLError } from 'graphql';
import * as cookieParser from 'cookie-parser';
import { SharedService } from './Shared/shared.service';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = errors.map(
          (error) =>
            `${error.property} has wrong value ${error.value}, ${Object.values(error.constraints).join(', ')}`,
        );

        return new GraphQLError(messages.join('-'), {
          extensions: {
            code: HttpStatus.BAD_REQUEST,
          },
        });
      },
    }),
  );

  app.enableCors({
    origin: process.env.ORIGIN || 'http://localhost:5173',
    credentials: true,
    // allowedHeaders: [
    //   'Content-Type',
    //   'apollo-require-preflight',
    //   'Accept',
    //   'Authorization',
    //   'X-Requested-With',
    // ],
  });
  const sharedService = app.get(SharedService);
  app.connectMicroservice(sharedService.getRmqOptions('NOTIFICATION'));
  app.startAllMicroservices();
  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
