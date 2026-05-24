import type { Request } from 'express';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  [key: string]: unknown;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
