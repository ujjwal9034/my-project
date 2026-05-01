import { Request, Response, NextFunction } from 'express';

// Fallback for missing routes
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global error handler
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Handle Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    message = 'Resource not found';
    statusCode = 404;
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    message = 'Duplicate field value entered';
    statusCode = 400;
  }

  // Handle Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map((val: any) => val.message).join(', ');
    statusCode = 400;
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
