import { Router, type Request, type Response } from 'express'
import pool from '../config/database.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.post('/apply', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.userId
  const { 
    gender,
    birth_date,
    political_status,
    mobile_phone,
    home_phone,
    id_card,
    department,
    position,
    home_address,
    zip_code,
    family_members,
    signature
  } = req.body

  if (!gender) {
    res.status(400).json({ success: false, error: '请选择性别' })
    return
  }

  if (!id_card) {
    res.status(400).json({ success: false, error: '请输入身份证号码' })
    return
  }

  const idCardRegex = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/
  if (!idCardRegex.test(id_card)) {
    res.status(400).json({ success: false, error: '请输入有效的身份证号码' })
    return
  }

  if (!department) {
    res.status(400).json({ success: false, error: '请输入所在部门' })
    return
  }

  if (!position) {
    res.status(400).json({ success: false, error: '请输入岗位（单位）' })
    return
  }

  if (!signature) {
    res.status(400).json({ success: false, error: '请完成电子签名' })
    return
  }

  if (mobile_phone) {
    const mobileRegex = /^1[3-9]\d{9}$/
    if (!mobileRegex.test(mobile_phone)) {
      res.status(400).json({ success: false, error: '请输入有效的手机号码' })
      return
    }
  }

  if (zip_code) {
    const zipRegex = /^\d{6}$/
    if (!zipRegex.test(zip_code)) {
      res.status(400).json({ success: false, error: '请输入有效的邮编（6位数字）' })
      return
    }
  }

  try {
    const existingMember = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND mutual_aid_member = TRUE',
      [userId]
    )

    if (existingMember.rows.length > 0) {
      res.status(400).json({ success: false, error: '您已经是爱心互助会会员，无需再次申请' })
      return
    }

    const existingApplication = await pool.query(
      'SELECT id, status FROM mutual_aid_applications WHERE user_id = $1',
      [userId]
    )

    if (existingApplication.rows.length > 0) {
      const app = existingApplication.rows[0]
      if (app.status === 'approved') {
        res.status(400).json({ success: false, error: '您的入会申请已通过，无需再次申请' })
        return
      }
      if (app.status === 'pending') {
        res.status(400).json({ success: false, error: '您已有入会申请正在审核中，请等待审核结果' })
        return
      }
    }

    const result = await pool.query(
      'INSERT INTO mutual_aid_applications (user_id, gender, birth_date, political_status, mobile_phone, home_phone, id_card, department, position, home_address, zip_code, family_members, signature) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
      [userId, gender, birth_date, political_status, mobile_phone, home_phone, id_card, department, position, home_address, zip_code, family_members, signature]
    )

    res.status(201).json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Mutual aid apply error:', error)
    res.status(500).json({ success: false, error: '提交申请失败' })
  }
})

router.get('/applications', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user
  const { status, marked_as_audited } = req.query

  try {
    let query = `
      SELECT ma.*, u.name, u.email, u.phone
      FROM mutual_aid_applications ma
      JOIN users u ON ma.user_id = u.id
    `
    const params: any[] = []

    if (status) {
      params.push(status)
      query += ` WHERE ma.status = $${params.length}`
    }

    if (marked_as_audited !== undefined && marked_as_audited !== '') {
      params.push(marked_as_audited === 'true')
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} ma.marked_as_audited = $${params.length}`
    }

    if (user.role === 'employee') {
      params.push(user.userId)
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} ma.user_id = $${params.length}`
    }

    query += ' ORDER BY ma.created_at DESC'

    const result = await pool.query(query, params)

    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取申请列表失败' })
  }
})

router.get('/applications/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user
  const id = parseInt(req.params.id)

  try {
    let query = `
      SELECT ma.*, u.name, u.email, u.phone
      FROM mutual_aid_applications ma
      JOIN users u ON ma.user_id = u.id
      WHERE ma.id = $1
    `
    const params: any[] = [id]

    if (user.role === 'employee') {
      params.push(user.userId)
      query += ' AND ma.user_id = $2'
    }

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '申请不存在' })
      return
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取申请详情失败' })
  }
})

router.put('/applications/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const userId = (req as any).user.userId
  const { status, remark, work_group_opinion, work_group_date, office_opinion, office_date } = req.body

  if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, error: '无效的审核状态' })
    return
  }

  try {
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId])
    const auditorName = userResult.rows[0]?.name || ''

    const result = await pool.query(
      'UPDATE mutual_aid_applications SET status = $1, remark = $2, work_group_opinion = $3, work_group_signature = $4, work_group_date = $5, office_opinion = $6, office_signature = $7, office_date = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *',
      [status, remark, work_group_opinion, auditorName, work_group_date, office_opinion, auditorName, office_date, id]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '申请不存在' })
      return
    }

    if (status === 'approved') {
      const application = result.rows[0]
      await pool.query(
        'UPDATE users SET mutual_aid_member = TRUE WHERE id = $1',
        [application.user_id]
      )
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '审核失败' })
  }
})

router.put('/applications/:id/mark-as-audited', authenticate, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const { marked_as_audited } = req.body

  try {
    const result = await pool.query(
      'UPDATE mutual_aid_applications SET marked_as_audited = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [marked_as_audited, id]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '申请不存在' })
      return
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Mutual aid mark as audited error:', error)
    res.status(500).json({ success: false, error: '标为已核失败' })
  }
})

router.put('/applications/batch/mark-as-audited', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { ids, marked_as_audited } = req.body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, error: '请选择要标记的申请' })
    return
  }

  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
    const result = await pool.query(
      `UPDATE mutual_aid_applications SET marked_as_audited = $${ids.length + 1}, updated_at = CURRENT_TIMESTAMP WHERE id = ANY(ARRAY[${placeholders}]) RETURNING id`,
      [...ids, marked_as_audited]
    )

    res.json({
      success: true,
      data: {
        updatedCount: result.rows.length,
        updatedIds: result.rows.map((row: any) => row.id)
      }
    })
  } catch (error) {
    console.error('Mutual aid batch mark as audited error:', error)
    res.status(500).json({ success: false, error: '批量标为已核失败' })
  }
})

export default router