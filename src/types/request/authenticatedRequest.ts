import { Request } from 'express';
import { User as AuthUser } from '../user';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
