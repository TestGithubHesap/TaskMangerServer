import { UserRole } from 'src/schemas/user.schema';

export interface User {
  _id: string;
  email: string;
  roles: UserRole[];
}
