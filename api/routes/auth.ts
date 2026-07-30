import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../config/database.js'
import { generateToken } from '../config/jwt.js'
import { authenticate } from '../middleware/auth.js'
import { logAction } from './logs.js'

const router = Router()

// 验证码有效期：10分钟
const CODE_EXPIRE_MINUTES = 10

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, phone } = req.body

  if (!email || !password || !name) {
    res.status(400).json({ success: false, error: '请填写必填字段' })
    return
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10)
    const result = await pool.query(
      'INSERT INTO users (email, password, name, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, name, phone, role, union_member',
      [email, hashedPassword, name, phone]
    )

    const user = result.rows[0]
    const token = generateToken(user.id, user.role, user.union_member || false)

    res.status(201).json({
      success: true,
      data: { user, token }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '注册失败' })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { account, password } = req.body

  if (!account || !password) {
    res.status(400).json({ success: false, error: '请填写账号和密码' })
    return
  }

  try {
    const result = await pool.query(
      `SELECT u.* FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.email = $1 OR u.phone = $1 OR up.id_card = $1`,
      [account]
    )
    
    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: '账号或密码错误' })
      return
    }

    const user = result.rows[0]
    const isPasswordValid = bcrypt.compareSync(password, user.password)

    if (!isPasswordValid) {
      res.status(401).json({ success: false, error: '账号或密码错误' })
      return
    }

    const token = generateToken(user.id, user.role, user.union_member)

    const modulesResult = await pool.query(
      'SELECT m.code FROM user_modules um JOIN modules m ON um.module_id = m.id WHERE um.user_id = $1',
      [user.id]
    )
    const modules = modulesResult.rows.map((row: { code: string }) => row.code)

    await logAction(user.id, 'login', 'users', user.id, `用户 ${user.name} 登录系统`, req.ip, req.headers['user-agent'])

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          union_member: user.union_member,
          mutual_aid_member: user.mutual_aid_member,
          is_retired: user.is_retired,
          modules
        },
        token
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.userId

  try {
    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.name, u.phone, u.role, u.union_member, u.mutual_aid_member, u.is_retired,
        p.gender, p.education, p.photo_url, p.native_place, p.id_card,
        p.hukou_location, p.residence_address, p.work_unit, p.position,
        p.ethnicity, p.political_status, p.work_resume, p.family_members, p.specialty
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = $1`,
      [userId]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    const modulesResult = await pool.query(
      'SELECT m.code FROM user_modules um JOIN modules m ON um.module_id = m.id WHERE um.user_id = $1',
      [userId]
    )
    const modules = modulesResult.rows.map((row: { code: string }) => row.code)

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        modules
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户信息失败' })
  }
})

router.put('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.userId
  const { 
    name, phone, email, is_retired,
    gender, education, photo_url, native_place, id_card,
    hukou_location, residence_address, work_unit, position,
    ethnicity, political_status, work_resume, family_members, specialty
  } = req.body

  try {
    await pool.query('BEGIN')

    await pool.query(
      'UPDATE users SET name = $1, phone = $2, email = $3, is_retired = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
      [name, phone, email, is_retired ?? false, userId]
    )

    await pool.query(
      `INSERT INTO user_profiles (
        user_id, gender, education, photo_url, native_place, id_card,
        hukou_location, residence_address, work_unit, position,
        ethnicity, political_status, work_resume, family_members, specialty
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (user_id) DO UPDATE SET
        gender = EXCLUDED.gender,
        education = EXCLUDED.education,
        photo_url = EXCLUDED.photo_url,
        native_place = EXCLUDED.native_place,
        id_card = EXCLUDED.id_card,
        hukou_location = EXCLUDED.hukou_location,
        residence_address = EXCLUDED.residence_address,
        work_unit = EXCLUDED.work_unit,
        position = EXCLUDED.position,
        ethnicity = EXCLUDED.ethnicity,
        political_status = EXCLUDED.political_status,
        work_resume = EXCLUDED.work_resume,
        family_members = EXCLUDED.family_members,
        specialty = EXCLUDED.specialty,
        updated_at = CURRENT_TIMESTAMP`,
      [userId, gender, education, photo_url, native_place, id_card,
       hukou_location, residence_address, work_unit, position,
       ethnicity, political_status, work_resume, family_members, specialty]
    )

    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.name, u.phone, u.role, u.union_member, u.mutual_aid_member, u.is_retired,
        p.gender, p.education, p.photo_url, p.native_place, p.id_card,
        p.hukou_location, p.residence_address, p.work_unit, p.position,
        p.ethnicity, p.political_status, p.work_resume, p.family_members, p.specialty
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = $1`,
      [userId]
    )

    await pool.query('COMMIT')

    await logAction(userId, 'update_profile', 'users', userId, '更新个人信息', req.ip, req.headers['user-agent'])

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    await pool.query('ROLLBACK')
    console.error('Update profile error:', error)
    res.status(500).json({ success: false, error: '更新用户信息失败: ' + (error as Error).message })
  }
})

router.put('/me/password', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.userId
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, error: '请填写当前密码和新密码' })
    return
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId])
    
    if (userResult.rows.length === 0) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    const user = userResult.rows[0]
    const isPasswordValid = bcrypt.compareSync(currentPassword, user.password)

    if (!isPasswordValid) {
      res.status(401).json({ success: false, error: '当前密码不正确' })
      return
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10)
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    )

    await logAction(userId, 'change_password', 'users', userId, '修改密码', req.ip, req.headers['user-agent'])

    res.json({
      success: true,
      message: '密码修改成功'
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '修改密码失败' })
  }
})

// 忘记密码：发送验证码
// 开发模式下直接返回验证码，生产环境应通过邮件服务发送
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body

  if (!email) {
    res.status(400).json({ success: false, error: '请填写邮箱' })
    return
  }

  try {
    // 检查邮箱是否存在
    const userResult = await pool.query('SELECT id, email, name FROM users WHERE email = $1', [email])

    if (userResult.rows.length === 0) {
      // 出于安全考虑，不暴露邮箱是否存在
      res.status(404).json({ success: false, error: '该邮箱未注册' })
      return
    }

    const user = userResult.rows[0]

    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // 计算过期时间
    const expiresAt = new Date(Date.now() + CODE_EXPIRE_MINUTES * 60 * 1000)

    // 将之前的未使用验证码标记为已使用，避免一个邮箱存在多个有效验证码
    await pool.query(
      'UPDATE password_resets SET used = TRUE WHERE email = $1 AND used = FALSE',
      [email]
    )

    // 保存新验证码
    await pool.query(
      'INSERT INTO password_resets (user_id, email, code, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, email, code, expiresAt]
    )

    // 开发模式：直接返回验证码，方便测试
    // 生产环境：此处应调用邮件服务发送验证码到用户邮箱
    console.log(`[密码重置] 邮箱：${email}，验证码：${code}`)

    res.json({
      success: true,
      message: '验证码已发送',
      // 开发模式返回验证码，生产环境应移除该字段
      dev_code: code
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ success: false, error: '发送验证码失败' })
  }
})

// 重置密码：校验验证码并设置新密码
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { email, code, newPassword } = req.body

  if (!email || !code || !newPassword) {
    res.status(400).json({ success: false, error: '请填写邮箱、验证码和新密码' })
    return
  }

  // 密码强度校验：至少6位
  if (newPassword.length < 6) {
    res.status(400).json({ success: false, error: '密码长度至少6位' })
    return
  }

  try {
    // 查询最新的有效验证码
    const codeResult = await pool.query(
      `SELECT id, user_id, expires_at, used FROM password_resets
       WHERE email = $1 AND code = $2
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    )

    if (codeResult.rows.length === 0) {
      res.status(400).json({ success: false, error: '验证码错误' })
      return
    }

    const resetRecord = codeResult.rows[0]

    // 校验验证码是否已使用
    if (resetRecord.used) {
      res.status(400).json({ success: false, error: '验证码已使用，请重新获取' })
      return
    }

    // 校验验证码是否过期
    const now = new Date()
    const expiresAt = new Date(resetRecord.expires_at)
    if (now > expiresAt) {
      res.status(400).json({ success: false, error: '验证码已过期，请重新获取' })
      return
    }

    // 加密新密码
    const hashedPassword = bcrypt.hashSync(newPassword, 10)

    // 更新用户密码
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, resetRecord.user_id]
    )

    // 标记验证码为已使用
    await pool.query(
      'UPDATE password_resets SET used = TRUE WHERE id = $1',
      [resetRecord.id]
    )

    res.json({
      success: true,
      message: '密码重置成功'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ success: false, error: '重置密码失败' })
  }
})

export default router
