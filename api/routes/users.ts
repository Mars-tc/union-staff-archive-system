import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../config/database.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { logAction } from './logs.js'

const VALID_ROLES = ['employee', 'admin', 'grass_root_auditor', 'union_committee_auditor']

const router = Router()

const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

router.get('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, role, union_member, mutual_aid_member, is_retired } = req.query

    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (role) {
      conditions.push(`role = $${paramIndex}`)
      params.push(role)
      paramIndex++
    }

    if (union_member !== undefined && union_member !== '') {
      conditions.push(`union_member = $${paramIndex}`)
      params.push(union_member === 'true')
      paramIndex++
    }

    if (mutual_aid_member !== undefined && mutual_aid_member !== '') {
      conditions.push(`mutual_aid_member = $${paramIndex}`)
      params.push(mutual_aid_member === 'true')
      paramIndex++
    }

    if (is_retired !== undefined && is_retired !== '') {
      conditions.push(`is_retired = $${paramIndex}`)
      params.push(is_retired === 'true')
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await pool.query(
      `SELECT id, email, name, phone, role, union_member, mutual_aid_member, is_retired, to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') as created_at FROM users ${whereClause} ORDER BY created_at DESC`,
      params
    )

    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户列表失败' })
  }
})

router.post('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, phone, role, is_retired } = req.body

  if (!email || !password || !name) {
    res.status(400).json({ success: false, error: '请填写必填字段' })
    return
  }

  if (role && !VALID_ROLES.includes(role)) {
    res.status(400).json({ success: false, error: '无效的角色类型' })
    return
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10)
    const result = await pool.query(
      'INSERT INTO users (email, password, name, phone, role, is_retired) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, phone, role, is_retired',
      [email, hashedPassword, name, phone, role || 'employee', is_retired || false]
    )

    await logAction((req as any).user.userId, 'create_user', 'users', result.rows[0].id, `创建用户: ${name}`, req.ip, req.headers['user-agent'])

    res.status(201).json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建用户失败' })
  }
})

router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const { name, phone, role, is_retired } = req.body

  if (role && !VALID_ROLES.includes(role)) {
    res.status(400).json({ success: false, error: '无效的角色类型' })
    return
  }

  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, phone = $2, role = $3, is_retired = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, email, name, phone, role, is_retired',
      [name, phone, role, is_retired ?? false, id]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    await logAction((req as any).user.userId, 'update_user', 'users', id, `更新用户: ${name}`, req.ip, req.headers['user-agent'])

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新用户失败' })
  }
})

router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id])

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    await logAction((req as any).user.userId, 'delete_user', 'users', id, `删除用户: ${result.rows[0].name}`, req.ip, req.headers['user-agent'])

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除用户失败' })
  }
})

router.post('/batch', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const usersData = req.body.users as Array<{ email: string; name: string; phone?: string; role?: string; is_retired?: boolean }>

  if (!usersData || !Array.isArray(usersData) || usersData.length === 0) {
    res.status(400).json({ success: false, error: '请提供用户列表' })
    return
  }

  for (const userData of usersData) {
    if (userData.role && !VALID_ROLES.includes(userData.role)) {
      res.status(400).json({ success: false, error: `用户 ${userData.email} 的角色类型无效` })
      return
    }
  }

  try {
    const results: Array<{
      id: number
      email: string
      name: string
      phone: string | null
      role: string
      is_retired: boolean
      password: string
    }> = []

    for (const userData of usersData) {
      if (!userData.email || !userData.name) {
        continue
      }

      const password = generatePassword()
      const hashedPassword = bcrypt.hashSync(password, 10)

      const result = await pool.query(
        'INSERT INTO users (email, password, name, phone, role, is_retired) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, name, phone, role, is_retired',
        [userData.email, hashedPassword, userData.name, userData.phone || null, userData.role || 'employee', userData.is_retired || false]
      )

      if (result.rows.length > 0) {
        results.push({
          ...result.rows[0],
          password
        })
      }
    }

    await logAction((req as any).user.userId, 'batch_create_users', 'users', null, `批量创建用户: ${results.length} 个`, req.ip, req.headers['user-agent'])

    res.status(201).json({
      success: true,
      data: results,
      count: results.length
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '批量创建用户失败: ' + ((error as Error).message || '未知错误') })
  }
})

router.put('/batch', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { ids, role, union_member, mutual_aid_member, is_retired } = req.body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, error: '请提供用户ID列表' })
    return
  }

  if (role && !VALID_ROLES.includes(role)) {
    res.status(400).json({ success: false, error: '无效的角色类型' })
    return
  }

  if (union_member !== undefined && typeof union_member !== 'boolean') {
    res.status(400).json({ success: false, error: '工会会员字段必须为布尔值' })
    return
  }

  if (mutual_aid_member !== undefined && typeof mutual_aid_member !== 'boolean') {
    res.status(400).json({ success: false, error: '爱心互助会会员字段必须为布尔值' })
    return
  }

  if (is_retired !== undefined && typeof is_retired !== 'boolean') {
    res.status(400).json({ success: false, error: '是否退休字段必须为布尔值' })
    return
  }

  if (!role && union_member === undefined && mutual_aid_member === undefined && is_retired === undefined) {
    res.status(400).json({ success: false, error: '请至少提供一个要更新的字段' })
    return
  }

  try {
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (role) {
      updates.push(`role = $${paramIndex++}`)
      params.push(role)
    }

    if (union_member !== undefined) {
      updates.push(`union_member = $${paramIndex++}`)
      params.push(union_member)
    }

    if (mutual_aid_member !== undefined) {
      updates.push(`mutual_aid_member = $${paramIndex++}`)
      params.push(mutual_aid_member)
    }

    if (is_retired !== undefined) {
      updates.push(`is_retired = $${paramIndex++}`)
      params.push(is_retired)
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    const placeholders = ids.map((_, i) => `$${paramIndex + i}`).join(',')
    params.push(...ids)

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id IN (${placeholders}) RETURNING id, email, name, phone, role, union_member, mutual_aid_member, is_retired`,
      params
    )

    await logAction((req as any).user.userId, 'batch_update_users', 'users', null, `批量更新用户: ${ids.length} 个`, req.ip, req.headers['user-agent'])

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '批量更新用户失败: ' + ((error as Error).message || '未知错误') })
  }
})

router.delete('/batch', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, error: '请提供用户ID列表' })
    return
  }

  try {
    const adminCheck = await pool.query(
      'SELECT id FROM users WHERE id IN (' + ids.map((_, i) => `$${i + 1}`).join(',') + ') AND role = $' + (ids.length + 1),
      [...ids, 'admin']
    )

    if (adminCheck.rows.length > 0) {
      res.status(400).json({ success: false, error: '不能删除管理员用户' })
      return
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id IN (' + ids.map((_, i) => `$${i + 1}`).join(',') + ') RETURNING id, email, name',
      ids
    )

    await logAction((req as any).user.userId, 'batch_delete_users', 'users', null, `批量删除用户: ${result.rows.length} 个`, req.ip, req.headers['user-agent'])

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '批量删除用户失败: ' + ((error as Error).message || '未知错误') })
  }
})

export default router
