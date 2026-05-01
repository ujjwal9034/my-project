import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware to handle validation results
export const handleValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
    return;
  }
  next();
};

// Registration validation rules
export const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  body('role')
    .optional()
    .isIn(['customer', 'seller']).withMessage('Invalid role'),
  handleValidation,
];

// Login validation rules
export const loginValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidation,
];

// Profile update validation
export const profileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s()-]{7,20}$/).withMessage('Invalid phone number format'),
  body('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidation,
];

// Change password validation
export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  handleValidation,
];

// Product validation
export const productValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Product name must be 2-100 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('category')
    .optional()
    .trim()
    .notEmpty().withMessage('Category is required'),
  handleValidation,
];

// Review validation
export const reviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 3, max: 500 }).withMessage('Comment must be 3-500 characters'),
  handleValidation,
];
