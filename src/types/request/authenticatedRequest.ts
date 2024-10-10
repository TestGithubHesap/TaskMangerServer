import { Request } from 'express';

interface User {
  _id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}
