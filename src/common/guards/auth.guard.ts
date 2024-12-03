import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { AuthService } from '../../auth/auth.service';
import { AuthenticatedRequest } from 'src/types/request/authenticatedRequest';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // console.log('can activate input');
    const { request, response } = this.getRequestResponse(context);
    // console.log(request, response);
    const jwt = request.cookies['access_token'];
    if (!jwt) {
      // console.log('jwt tok', request.cookies);
      return this.handleUnauthorized(request, response);
    }

    try {
      const { user, exp } = await this.authService.verifyAcccessToken(jwt);
      const TOKEN_EXP_MS = exp * 1000;

      if (Date.now() < TOKEN_EXP_MS) {
        request.user = user;
        return true;
      } else {
        return this.refreshToken(request, response);
      }
    } catch (error) {
      return this.refreshToken(request, response);
    }
  }

  // Yardımcı Fonksiyon: Request ve Response alma
  private getRequestResponse(context: ExecutionContext) {
    // console.log(context.getType());
    if (context.getType().toString() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      return {
        request: gqlContext.getContext().req,
        response: gqlContext.getContext().res,
      };
    } else {
      return {
        request: context.switchToHttp().getRequest<Request>(),
        response: context.switchToHttp().getResponse<Response>(),
      };
    }
  }

  // Yardımcı Fonksiyon: Access token'ı yenileme işlemi
  private async refreshToken(
    request: AuthenticatedRequest,
    response: Response,
  ): Promise<boolean> {
    const refreshToken = request.cookies['refresh_token'];
    if (!refreshToken) {
      console.log('refresh token yok');
      return false;
    }

    try {
      const { access_token, user } =
        await this.authService.refreshAccessToken(refreshToken);
      if (!access_token) {
        return false;
      }

      request.headers['authorization'] = `Bearer ${access_token}`;
      response.cookie('access_token', access_token);
      request.user = user;

      return true;
    } catch (error) {
      return false;
    }
  }

  // Yardımcı Fonksiyon: Yetkilendirme başarısız olduğunda işlemler
  private handleUnauthorized(
    request: AuthenticatedRequest,
    response: Response,
  ): boolean {
    // Yetkisiz erişim olduğunda buraya ek işlemler ekleyebilirsiniz.
    // console.log('jwt is not found handleUnauthorized');
    return false;
  }
}
