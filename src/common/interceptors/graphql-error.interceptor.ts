import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GraphQLError } from 'graphql';

@Injectable()
export class GraphQLErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof GraphQLError) {
          // If it's already a GraphQLError, just rethrow it
          return throwError(() => error);
        }
        // Otherwise, wrap it in a GraphQLError
        return throwError(
          () =>
            new GraphQLError(error.message, {
              extensions: {
                code: error.status || 'INTERNAL_SERVER_ERROR',
                stacktrace: error.stack,
              },
            }),
        );
      }),
    );
  }
}
