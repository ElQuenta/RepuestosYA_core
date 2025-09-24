import jwt, { JwtPayload } from 'jsonwebtoken';

import config from '../config/config';

const JWT_SECRET = config.jwt.tokenSecret;

const generateToken = (userId: number, roles?: string[]) => {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    id: userId,
    roles,
  };

  return jwt.sign(payload, JWT_SECRET);
};

const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export { generateToken, verifyToken };