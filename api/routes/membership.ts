import { Router, type Request, type Response } from 'express'
import pool from '../config/database.js'
import { authenticate, requireAdmin, requireGrassRootAuditor, requireUnionCommitteeAuditor } from '../middleware/auth.js'

const router = Router()

router.post('/apply', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.userId
  const { 
    position, 
    signature,
    gender,
    native_place,
    education,
    id_card,
    hukou_location,
    ethnicity,
    residence_address,
    political_status,
    contact_phone,
    work_resume,
    family_members,
    specialty
  } = req.body

  if (!position || !signature) {
    res.status(400).json({ success: false, error: '请填写完整信息' })
    return
  }

  try {
    const existingMember = await pool.query(
      'SELECT id FROM union_members WHERE user_id = $1',
      [userId]
    )

    if (existingMember.rows.length > 0) {
      res.status(400).json({ success: false, error: '您已经是工会会员，无需再次申请' })
      return
    }

    const existingApplication = await pool.query(
      'SELECT id, status, audit_step FROM membership_applications WHERE user_id = $1',
      [userId]
    )

    if (existingApplication.rows.length > 0) {
      const app = existingApplication.rows[0]
      if (app.status === 'approved') {
        res.status(400).json({ success: false, error: '您的入会申请已通过，无需再次申请' })
        return
      }
      if (app.status === 'pending' || app.audit_step !== 'completed') {
        res.status(400).json({ success: false, error: '您已有入会申请正在审核中，请等待审核结果' })
        return
      }
    }

    const result = await pool.query(
      'INSERT INTO membership_applications (user_id, position, gender, native_place, education, id_card, hukou_location, ethnicity, residence_address, political_status, contact_phone, work_resume, family_members, specialty, signature) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
      [userId, position, gender, native_place, education, id_card, hukou_location, ethnicity, residence_address, political_status, contact_phone, work_resume, family_members, specialty, signature]
    )

    res.status(201).json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Membership apply error:', error)
    res.status(500).json({ success: false, error: '提交申请失败' })
  }
})

router.get('/applications', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user
  const { status, mine, marked_as_audited } = req.query

  try {
    let query = `
      SELECT ma.*, u.name, u.email, u.phone
      FROM membership_applications ma
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

    if (mine === 'true' || user.role === 'employee') {
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
      FROM membership_applications ma
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

router.put('/applications/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const user = (req as any).user
  const userId = user.userId
  const userRole = user.role
  const { 
    status, 
    remark, 
    grass_root_opinion, 
    grass_root_date,
    union_committee_opinion,
    union_committee_date,
    audit_step,
    tags
  } = req.body

  if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, error: '无效的审核状态' })
    return
  }

  try {
    const currentResult = await pool.query('SELECT * FROM membership_applications WHERE id = $1', [id])
    if (currentResult.rows.length === 0) {
      res.status(404).json({ success: false, error: '申请不存在' })
      return
    }

    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId])
    const auditorName = userResult.rows[0]?.name || ''

    const current = currentResult.rows[0]
    const currentAuditStep = current.audit_step || 'pending'

    if (userRole === 'grass_root_auditor') {
      if (currentAuditStep !== 'pending' && currentAuditStep !== 'grass_root') {
        res.status(403).json({ success: false, error: '当前步骤不允许基层审核人操作' })
        return
      }
      if (union_committee_opinion || union_committee_date) {
        res.status(403).json({ success: false, error: '基层审核人不能填写委员会审核意见' })
        return
      }
    } else if (userRole === 'union_committee_auditor') {
      if (currentAuditStep !== 'grass_root' && currentAuditStep !== 'union_committee') {
        res.status(403).json({ success: false, error: '当前步骤不允许委员会审核人操作，请先完成基层审核' })
        return
      }
      if (grass_root_opinion || grass_root_date) {
        res.status(403).json({ success: false, error: '委员会审核人不能修改基层审核意见' })
        return
      }
    } else if (userRole !== 'admin') {
      res.status(403).json({ success: false, error: '权限不足' })
      return
    }

    let newAuditStep = audit_step
    if (!newAuditStep) {
      if (userRole === 'grass_root_auditor') {
        newAuditStep = status === 'rejected' ? 'completed' : 'union_committee'
      } else if (userRole === 'union_committee_auditor') {
        newAuditStep = 'completed'
      } else {
        newAuditStep = currentAuditStep
      }
    }

    const result = await pool.query(
      'UPDATE membership_applications SET status = $1, remark = $2, grass_root_opinion = $3, grass_root_signature = $4, grass_root_date = $5, union_committee_opinion = $6, union_committee_signature = $7, union_committee_date = $8, auditor_id = $9, audit_step = $10, tags = $11, updated_at = CURRENT_TIMESTAMP WHERE id = $12 RETURNING *',
      [status, remark, grass_root_opinion, auditorName, grass_root_date || null, union_committee_opinion, auditorName, union_committee_date || null, userId, newAuditStep, tags || '[]', id]
    )

    if (status === 'approved' && newAuditStep === 'completed') {
      const application = result.rows[0]
      await pool.query(
        'INSERT INTO union_members (user_id, position, join_date) VALUES ($1, $2, CURRENT_DATE) ON CONFLICT (user_id) DO UPDATE SET position = $2, join_date = CURRENT_DATE',
        [application.user_id, application.position]
      )
      await pool.query(
        'UPDATE users SET union_member = TRUE WHERE id = $1',
        [application.user_id]
      )
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Membership audit error:', error)
    res.status(500).json({ success: false, error: '审核失败' })
  }
})

router.put('/applications/batch', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user
  const userId = user.userId
  const userRole = user.role
  const { ids, status, remark, grass_root_opinion, grass_root_date, union_committee_opinion, union_committee_date } = req.body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, error: '请选择要审核的申请' })
    return
  }

  if (!status || !['approved', 'rejected'].includes(status)) {
    res.status(400).json({ success: false, error: '无效的审核状态' })
    return
  }

  try {
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId])
    const auditorName = userResult.rows[0]?.name || ''

    const currentResult = await pool.query(
      'SELECT id, audit_step, status FROM membership_applications WHERE id = ANY($1)',
      [ids]
    )

    const invalidApplications: number[] = []
    const validApplications: any[] = []

    for (const app of currentResult.rows) {
      if (app.status !== 'pending') {
        invalidApplications.push(app.id)
        continue
      }

      const currentAuditStep = app.audit_step || 'pending'
      if (userRole === 'grass_root_auditor') {
        if (currentAuditStep !== 'pending' && currentAuditStep !== 'grass_root') {
          invalidApplications.push(app.id)
          continue
        }
      } else if (userRole === 'union_committee_auditor') {
        if (currentAuditStep !== 'grass_root' && currentAuditStep !== 'union_committee') {
          invalidApplications.push(app.id)
          continue
        }
      } else if (userRole !== 'admin') {
        invalidApplications.push(app.id)
        continue
      }

      validApplications.push(app)
    }

    if (validApplications.length === 0) {
      res.status(400).json({ success: false, error: '没有可审核的申请' })
      return
    }

    const validIds = validApplications.map(app => app.id)
    const placeholders = validIds.map((_, i) => `$${i + 1}`).join(', ')

    let newAuditStep: string
    if (status === 'rejected') {
      newAuditStep = 'completed'
    } else {
      if (userRole === 'grass_root_auditor') {
        newAuditStep = 'union_committee'
      } else if (userRole === 'union_committee_auditor' || userRole === 'admin') {
        newAuditStep = 'completed'
      } else {
        newAuditStep = 'pending'
      }
    }

    let finalStatus = status
    if (status === 'approved' && userRole === 'grass_root_auditor') {
      finalStatus = 'pending'
    }

    const result = await pool.query(
      `UPDATE membership_applications SET status = $${validIds.length + 1}, remark = $${validIds.length + 2}, grass_root_opinion = $${validIds.length + 3}, grass_root_signature = $${validIds.length + 4}, grass_root_date = $${validIds.length + 5}, union_committee_opinion = $${validIds.length + 6}, union_committee_signature = $${validIds.length + 7}, union_committee_date = $${validIds.length + 8}, auditor_id = $${validIds.length + 9}, audit_step = $${validIds.length + 10}, updated_at = CURRENT_TIMESTAMP WHERE id = ANY(ARRAY[${placeholders}]) RETURNING *`,
      [...validIds, finalStatus, remark, grass_root_opinion, auditorName, grass_root_date || null, union_committee_opinion, auditorName, union_committee_date || null, userId, newAuditStep]
    )

    if (finalStatus === 'approved' && newAuditStep === 'completed') {
      for (const application of result.rows) {
        await pool.query(
          'INSERT INTO union_members (user_id, position, join_date) VALUES ($1, $2, CURRENT_DATE) ON CONFLICT (user_id) DO UPDATE SET position = $2, join_date = CURRENT_DATE',
          [application.user_id, application.position]
        )
        await pool.query(
          'UPDATE users SET union_member = TRUE WHERE id = $1',
          [application.user_id]
        )
      }
    }

    res.json({
      success: true,
      data: {
        updatedCount: result.rows.length,
        skippedCount: invalidApplications.length,
        skippedIds: invalidApplications
      }
    })
  } catch (error) {
    console.error('Membership batch audit error:', error)
    res.status(500).json({ success: false, error: '批量审核失败' })
  }
})

router.put('/applications/:id/tags', authenticate, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const { tags } = req.body

  try {
    const result = await pool.query(
      'UPDATE membership_applications SET tags = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [tags || '[]', id]
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
    console.error('Membership update tags error:', error)
    res.status(500).json({ success: false, error: '更新标签失败' })
  }
})

router.put('/applications/:id/mark-as-audited', authenticate, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const { marked_as_audited } = req.body

  try {
    const result = await pool.query(
      'UPDATE membership_applications SET marked_as_audited = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
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
    console.error('Membership mark as audited error:', error)
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
      `UPDATE membership_applications SET marked_as_audited = $${ids.length + 1}, updated_at = CURRENT_TIMESTAMP WHERE id = ANY(ARRAY[${placeholders}]) RETURNING id`,
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
    console.error('Membership batch mark as audited error:', error)
    res.status(500).json({ success: false, error: '批量标为已核失败' })
  }
})

export default router
