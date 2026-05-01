import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.');
  }
  return secret;
};

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, getJwtSecret(), {
    expiresIn: '30d',
  });
};

export default generateToken;
