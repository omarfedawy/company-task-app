import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    console.error('Hashing error:', error);
    throw error;
  }
};

export const verifyPassword = async (password, hashedPassword) => {
  try {
    if (!hashedPassword) return false;
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
};