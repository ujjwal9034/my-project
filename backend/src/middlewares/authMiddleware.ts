import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
  }
  return secret;
};

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  token = req.cookies.jwt;

  if (token) {
    try {
      const decoded: any = jwt.verify(token, getJwtSecret());
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        return next(new Error('User not found'));
      }

      // Check if user is banned
      if (req.user.isBanned) {
        res.status(403);
        return next(new Error('Your account has been suspended. Contact support.'));
      }

      next();
    } catch (error) {
      res.status(401);
      next(new Error('Not authorized, token failed'));
    }
  } else {
    res.status(401);
    next(new Error('Not authorized, no token'));
  }
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401);
    next(new Error('Not authorized as an admin'));
  }
};

export const seller = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'seller' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(401);
    next(new Error('Not authorized as a seller'));
  }
};
