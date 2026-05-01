import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers to automatically catch errors
 * and forward them to Express error handling middleware.
 * This prevents unhandled promise rejections from crashing the server.
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
