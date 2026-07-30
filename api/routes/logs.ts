import { Router, type Request, type Response } from 'express'
import pool from '../config/database.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

export const logAction = async (
  userId: number | null,
  action: string,
  resource?: string,
  resourceId?: number,
  details?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  try {
    await pool.query(
      'INSERT INTO system_logs (user_id, action, resource, resource_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, action, resource || null, resourceId || null, details || null, ipAddress || null, userAgent || null]
    )
  } catch (error) {
    console.error('Failed to log action:', error)
  }
}

router.get('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 20, action, userId, startDate, endDate } = req.query

  try {
    let query = `
      SELECT sl.*, u.name as user_name, u.email as user_email
      FROM system_logs sl
      LEFT JOIN users u ON sl.user_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (action) {
      query += ` AND sl.action = $${paramIndex++}`
      params.push(action)
    }

    if (userId) {
      query += ` AND sl.user_id = $${paramIndex++}`
      params.push(parseInt(userId as string))
    }

    if (startDate) {
      query += ` AND sl.created_at >= $${paramIndex++}`
      params.push(new Date(startDate as string))
    }

    if (endDate) {
      query += ` AND sl.created_at <= $${paramIndex++}`
      params.push(new Date((endDate as string) + 'T23:59:59.999Z'))
    }

    query += ` ORDER BY sl.created_at DESC`

    let countQuery = `SELECT COUNT(*) FROM system_logs sl WHERE 1=1`
    const countParams: any[] = []
    let countParamIndex = 1

    if (action) {
      countQuery += ` AND sl.action = $${countParamIndex++}`
      countParams.push(action)
    }

    if (userId) {
      countQuery += ` AND sl.user_id = $${countParamIndex++}`
      countParams.push(parseInt(userId as string))
    }

    if (startDate) {
      countQuery += ` AND sl.created_at >= $${countParamIndex++}`
      countParams.push(new Date(startDate as string))
    }

    if (endDate) {
      countQuery += ` AND sl.created_at <= $${countParamIndex++}`
      countParams.push(new Date((endDate as string) + 'T23:59:59.999Z'))
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count)

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(parseInt(limit as string), offset)

    const result = await pool.query(query, params)

    res.json({
      success: true,
      data: result.rows,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      pages: Math.ceil(total / parseInt(limit as string))
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取日志列表失败: ' + ((error as Error).message || '未知错误') })
  }
})

router.get('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)

  try {
    const result = await pool.query(
      `SELECT sl.*, u.name as user_name, u.email as user_email
       FROM system_logs sl
       LEFT JOIN users u ON sl.user_id = u.id
       WHERE sl.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '日志不存在' })
      return
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取日志详情失败' })
  }
})

router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)

  try {
    const result = await pool.query('DELETE FROM system_logs WHERE id = $1 RETURNING *', [id])

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: '日志不存在' })
      return
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除日志失败' })
  }
})

router.delete('/batch', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, error: '请提供日志ID列表' })
    return
  }

  try {
    const result = await pool.query(
      'DELETE FROM system_logs WHERE id IN (' + ids.map((_, i) => `$${i + 1}`).join(',') + ') RETURNING id',
      ids
    )

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '批量删除日志失败' })
  }
})

export default router