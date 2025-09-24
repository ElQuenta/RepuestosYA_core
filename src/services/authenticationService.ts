import bcrypt from 'bcryptjs';

export const verifyPassword = async (
  inputPassword: string,
  storedPassword: string
): Promise<boolean> => {
  try {
    return await bcrypt.compare(inputPassword, storedPassword);
  } catch (error) {
    console.error('Error al verificar la contraseña:', error);
    throw error;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt: string = await bcrypt.genSalt(10);
  const hashedPassword: string = await bcrypt.hash(password, salt);
  return hashedPassword;
};