import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'union_staff_jwt_secret_key_2024'

export const generateToken = (userId: number, role: string, union_member: boolean): string => {
  return jwt.sign({ userId, role, union_member }, JWT_SECRET, { expiresIn: '7d' })
}

export const verifyToken = (token: string): { userId: number; role: string; union_member: boolean } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string; union_member: boolean }
    return decoded
  } catch {
    return null
  }
}
