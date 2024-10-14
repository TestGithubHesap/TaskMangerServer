import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticatedRequest } from 'src/types/request/authenticatedRequest';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles || roles.length === 0) {
      return true; // Eğer rol tanımlanmamışsa, erişime izin ver
    }

    const ctx = GqlExecutionContext.create(context);
    const { user } = ctx.getContext().req as AuthenticatedRequest;

    if (!user) {
      throw new UnauthorizedException('User is not authenticated');
    }

    if (!Array.isArray(user.roles) || user.roles.length === 0) {
      throw new ForbiddenException('User has no roles assigned');
    }

    const hasRole = user.roles.some((role) => roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('You do not have the required roles');
    }

    return true;
  }
}
