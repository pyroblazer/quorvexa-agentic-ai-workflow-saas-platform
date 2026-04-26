import type { Request as ExpressRequest } from 'express';

export interface AuthenticatedRequest extends ExpressRequest {
  user: {
    sub: string;
    email: string;
    role: string;
    tenantId: string;
    [key: string]: unknown;
  };
}
