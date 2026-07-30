import { type Request, type Response, type NextFunction } from 'express'
import { verifyToken } from '../config/jwt.js'

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    res.status(401).json({ success: false, error: '未登录' })
    return
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    res.status(401).json({ success: false, error: '无效的token' })
    return
  }

  (req as any).user = decoded
  next()
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user
  if (!user || user.role !== 'admin') {
    res.status(403).json({ success: false, error: '权限不足' })
    return
  }
  next()
}

export const requireGrassRootAuditor = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user
  if (!user || (user.role !== 'grass_root_auditor' && user.role !== 'admin')) {
    res.status(403).json({ success: false, error: '权限不足，需要基层审核人权限' })
    return
  }
  next()
}

export const requireUnionCommitteeAuditor = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user
  if (!user || (user.role !== 'union_committee_auditor' && user.role !== 'admin')) {
    res.status(403).json({ success: false, error: '权限不足，需要委员会审核人权限' })
    return
  }
  next()
}

export const requireAnyAuditor = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user
  if (!user || !['grass_root_auditor', 'union_committee_auditor', 'admin'].includes(user.role)) {
    res.status(403).json({ success: false, error: '权限不足，需要审核人权限' })
    return
  }
  next()
}

export const requireEmployee = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user
  if (!user || user.role !== 'employee') {
    res.status(403).json({ success: false, error: '权限不足，需要普通职工权限' })
    return
  }
  next()
}
