import { Router, type Request, type Response } from 'express'
import pool from '../config/database.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.post('/authorize', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.userId
  const { signature, start_date } = req.body

  if (!signature || !start_date) {
    res.status(400).json({ success: false, error: '请填写完整信息' })
    return
  }

  try {
    const userResult = await pool.query(
      'SELECT union_member FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0 || !userResult.rows[0].union_member) {
      res.status(403).json({
        success: false,
        error: '只有工会会员才能申请会费授权'
      })
      return
    }

    const existingApplication = await pool.query(
      'SELECT id, status, audit_step FROM fee_authorizations WHERE user_id = $1',
      [userId]
    )

    if (existingApplication.rows.length > 0) {
      const app = existingApplication.rows[0]
      if (app.status === 'approved') {
        res.status(400).json({ success: false, error: '您的会费授权已通过，无需再次申请' })
        return
      }
      if (app.status === 'pending' || app.audit_step !== 'completed') {
        res.status(400).json({ success: false, error: '您已有会费授权申请正在审核中，请等待审核结果' })
        return
      }
    }

    const result = await pool.query(
      'INSERT INTO fee_authorizations (user_id, signature, start_date) VALUES ($1, $2, $3) RETURNING *',
      [userId, signature, start_date]
    )

    res.status(201).json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Fee authorization apply error:', error)
    res.status(500).json({ success: false, error: '提交申请失败' })
  }
})

router.get('/authorizations', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user
  const { status, mine } = req.query

  try {
    let query = `
      SELECT fa.*, u.name, u.email
      FROM fee_authorizations fa
      JOIN users u ON fa.user_id = u.id
    `
    const params: any[] = []

    if (status) {
      params.push(status)
      query += ` WHERE fa.status = $${params.length}`
    }

    if (mine === 'true' || user.role === 'employee') {
      params.push(user.userId)
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} fa.user_id = $${params.length}`
    }

    query += ' ORDER BY fa.created_at DESC'

    const result = await pool.query(query, params)

    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取授权列表失败' })
  }
})

router.get('/authorizations/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user
  const id = parseInt(req.params.id)

  try {
    let query = `
      SELECT fa.*, u.name, u.email
      FROM fee_authorizations fa
      JOIN users u ON fa.user_id = u.id
      WHERE fa.id = $1
    `
    const params: any[] = [id]

    if (user.role === 'employee') {
      params.push(user.userId)
      query += ' AND fa.user_id = $2'
    }

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '授权申请不存在' })
      return
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取授权详情失败' })
  }
})

router.put('/authorizations/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const userId = (req as any).user.userId
  const {
    status,
    remark,
    grass_root_opinion,
    grass_root_date,
    union_committee_opinion,
    union_committee_date,
    audit_step,
    start_date
  } = req.body

  if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, error: '无效的审核状态' })
    return
  }

  try {
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId])
    const auditorName = userResult.rows[0]?.name || ''

    const currentResult = await pool.query(
      'SELECT * FROM fee_authorizations WHERE id = $1',
      [id]
    )

    if (currentResult.rows.length === 0) {
      res.status(404).json({ success: false, error: '授权申请不存在' })
      return
    }

    const current = currentResult.rows[0]
    const updates: string[] = []
    const params: unknown[] = []
    let nextStep = current.audit_step || 'pending'

    if (start_date !== undefined) {
      params.push(start_date || null)
      updates.push(`start_date = $${params.length}`)
    }

    if (grass_root_opinion !== undefined) {
      params.push(grass_root_opinion || null)
      updates.push(`grass_root_opinion = $${params.length}`)
      params.push(auditorName)
      updates.push(`grass_root_signature = $${params.length}`)
    }
    if (grass_root_date !== undefined) {
      params.push(grass_root_date || null)
      updates.push(`grass_root_date = $${params.length}`)
    }

    if (union_committee_opinion !== undefined) {
      params.push(union_committee_opinion || null)
      updates.push(`union_committee_opinion = $${params.length}`)
      params.push(auditorName)
      updates.push(`union_committee_signature = $${params.length}`)
    }
    if (union_committee_date !== undefined) {
      params.push(union_committee_date || null)
      updates.push(`union_committee_date = $${params.length}`)
    }

    if (audit_step !== undefined) {
      nextStep = audit_step
    }

    if (status !== undefined) {
      params.push(status)
      updates.push(`status = $${params.length}`)
      if (status === 'approved') {
        nextStep = 'completed'
      } else if (status === 'rejected') {
        nextStep = 'completed'
      }
    }

    if (remark !== undefined) {
      params.push(remark || null)
      updates.push(`remark = $${params.length}`)
    }

    params.push(userId)
    updates.push(`auditor_id = $${params.length}`)

    params.push(nextStep)
    updates.push(`audit_step = $${params.length}`)

    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    params.push(id)

    const result = await pool.query(
      `UPDATE fee_authorizations SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    )

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Fee authorization audit error:', error)
    res.status(500).json({ success: false, error: '审核失败' })
  }
})

export default router
