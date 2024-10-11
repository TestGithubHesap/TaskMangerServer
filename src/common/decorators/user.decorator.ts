import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticatedRequest } from 'src/types/request/authenticatedRequest';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedRequest['user'] | undefined, context: ExecutionContext) => {
    const { user } = GqlExecutionContext.create(context).getContext().req as AuthenticatedRequest;
    
    // Eğer 'data' parametresi varsa, sadece o field'ı döndür.
    // Yoksa, tüm user objesini döndür.
    return data ? user?.[data] : user;
  },
);
