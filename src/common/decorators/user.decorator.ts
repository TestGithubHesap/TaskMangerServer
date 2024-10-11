import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticatedRequest } from 'src/types/request/authenticatedRequest';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const req = GqlExecutionContext.create(context).getContext().req as AuthenticatedRequest;
    const user = req.user
    return user;
  },
);
