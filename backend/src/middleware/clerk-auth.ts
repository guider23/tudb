import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';

// Clerk middleware for all routes
export const clerkAuth = clerkMiddleware();

// Require authentication middleware
export const requireAuthentication = requireAuth();

// Extract user ID from Clerk auth
export const extractUserId = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const auth = getAuth(req);
    
    if (!auth || !auth.userId) {
      res.status(401).json({ error: 'Unauthorized - No user ID found' });
      return;
    }
    
    // Attach user ID to res.locals for downstream use
    res.locals.userId = auth.userId;
    next();
  } catch (error) {
    console.error('Auth extraction error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
