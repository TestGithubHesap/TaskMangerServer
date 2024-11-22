import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { GraphQLError } from 'graphql';
import * as cookieParser from 'cookie-parser';
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
    origin: ['http://localhost:5173'],
    allowedHeaders: [
      'Content-Type',
      'apollo-require-preflight',
      'Accept',
      'Authorization',
      'X-Requested-With',
    ],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
