import { Router, type Request, type Response } from 'express'
import pool from '../config/database.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

type RequestWithUser = Request & { user: { userId: number; role: string; mutual_aid_member: boolean } }

const router = Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'))
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

const upload = multer({ storage })

router.post('/apply', authenticate, async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user.userId
  const { disease_type_id, amount, reason, signature, difficulty_category, family_income, family_members, bank_account, bank_name, bank_account_name } = req.body

  if (!amount || !reason || !signature || !difficulty_category) {
    res.status(400).json({ success: false, error: '请填写完整信息' })
    return
  }

  if (difficulty_category === 'disease' && !disease_type_id) {
    res.status(400).json({ success: false, error: '因病致困需要选择病种' })
    return
  }

  try {
    const userResult = await pool.query(
      'SELECT mutual_aid_member FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0 || !userResult.rows[0].mutual_aid_member) {
      res.status(403).json({ 
        success: false, 
        error: '请先加入爱心互助会成为会员后再申请爱心帮扶' 
      })
      return
    }

    if (disease_type_id) {
      const checkResult = await pool.query(
        'SELECT * FROM mutual_aid_difficulty_applications WHERE user_id = $1 AND disease_type_id = $2',
        [userId, disease_type_id]
      )

      if (checkResult.rows.length > 0) {
        const diseaseResult = await pool.query('SELECT name FROM disease_types WHERE id = $1', [disease_type_id])
        const diseaseName = diseaseResult.rows[0]?.name || '该病种'
        res.status(400).json({ 
          success: false, 
          error: `${diseaseName}已申请过爱心帮扶，同一病种仅能申请一次` 
        })
        return
      }
    }

    const result = await pool.query(
      'INSERT INTO mutual_aid_difficulty_applications (user_id, disease_type_id, amount, reason, signature, difficulty_category, family_income, family_members, bank_account, bank_name, bank_account_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [userId, disease_type_id || null, amount, reason, signature, difficulty_category, family_income || null, family_members || null, bank_account || null, bank_name || null, bank_account_name || null]
    )

    res.status(201).json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Apply error:', error)
    res.status(500).json({ success: false, error: '提交申请失败' })
  }
})

router.post('/upload-document/:id', authenticate, upload.single('document'), async (req: RequestWithUser, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const userId = req.user.userId

  if (!req.file) {
    res.status(400).json({ success: false, error: '请选择文件' })
    return
  }

  try {
    const checkResult = await pool.query(
      'SELECT user_id FROM mutual_aid_difficulty_applications WHERE id = $1',
      [id]
    )

    if (checkResult.rows.length === 0) {
      res.status(404).json({ success: false, error: '申请不存在' })
      return
    }

    if (checkResult.rows[0].user_id !== userId && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: '权限不足' })
      return
    }

    await pool.query(
      'UPDATE mutual_aid_difficulty_applications SET document_path = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [req.file.filename, id]
    )

    res.json({
      success: true,
      data: { document_path: req.file.filename }
    })
  } catch {
    res.status(500).json({ success: false, error: '上传失败' })
  }
})

router.get('/check-duplicate', authenticate, async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user.userId
  const { disease_type_id, target_user_id } = req.query

  if (!disease_type_id) {
    res.json({
      success: true,
      data: {
        isDuplicate: false,
        existingApplication: null
      }
    })
    return
  }

  const checkUserId = target_user_id ? parseInt(target_user_id as string) : userId

  try {
    const checkResult = await pool.query(
      'SELECT mada.*, dt.name as disease_name FROM mutual_aid_difficulty_applications mada JOIN disease_types dt ON mada.disease_type_id = dt.id WHERE mada.user_id = $1 AND mada.disease_type_id = $2',
      [checkUserId, disease_type_id]
    )

    res.json({
      success: true,
      data: {
        isDuplicate: checkResult.rows.length > 0,
        existingApplication: checkResult.rows[0] || null
      }
    })
  } catch {
    res.status(500).json({ success: false, error: '检查失败' })
  }
})

router.get('/applications', authenticate, async (req: RequestWithUser, res: Response): Promise<void> => {
  const user = req.user
  const { status, disease_type_id, difficulty_category, audit_step, marked_as_audited } = req.query

  try {
    let query = `
      SELECT mada.*, u.name, u.email, u.phone, dt.name as disease_name, dt.category as disease_category
      FROM mutual_aid_difficulty_applications mada
      JOIN users u ON mada.user_id = u.id
      LEFT JOIN disease_types dt ON mada.disease_type_id = dt.id
    `
    const params: unknown[] = []

    if (status) {
      params.push(status)
      query += ` WHERE mada.status = $${params.length}`
    }

    if (disease_type_id) {
      params.push(disease_type_id)
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} mada.disease_type_id = $${params.length}`
    }

    if (difficulty_category) {
      params.push(difficulty_category)
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} mada.difficulty_category = $${params.length}`
    }

    if (audit_step) {
      params.push(audit_step)
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} mada.audit_step = $${params.length}`
    }

    if (marked_as_audited !== undefined && marked_as_audited !== '') {
      params.push(marked_as_audited === 'true')
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} mada.marked_as_audited = $${params.length}`
    }

    if (user.role === 'employee') {
      params.push(user.userId)
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} mada.user_id = $${params.length}`
    }

    query += ' ORDER BY mada.created_at DESC'

    const result = await pool.query(query, params)

    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Get applications error:', error)
    res.status(500).json({ success: false, error: '获取申请列表失败' })
  }
})

router.get('/applications/:id', authenticate, async (req: RequestWithUser, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const user = req.user

  try {
    let query = `
      SELECT mada.*, u.name, u.email, u.phone, dt.name as disease_name, dt.category as disease_category
      FROM mutual_aid_difficulty_applications mada
      JOIN users u ON mada.user_id = u.id
      LEFT JOIN disease_types dt ON mada.disease_type_id = dt.id
      WHERE mada.id = $1
    `
    const params: unknown[] = [id]

    if (user.role === 'employee') {
      params.push(user.userId)
      query += ` AND mada.user_id = $${params.length}`
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
  } catch {
    res.status(500).json({ success: false, error: '获取申请详情失败' })
  }
})

router.put('/applications/:id', authenticate, async (req: RequestWithUser, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const userId = req.user.userId
  const userRole = req.user.role
  const { status, remark, grass_root_opinion, grass_root_date, union_committee_opinion, union_committee_date, audit_step, actual_amount } = req.body

  try {
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId])
    const auditorName = userResult.rows[0]?.name || ''

    const currentResult = await pool.query('SELECT * FROM mutual_aid_difficulty_applications WHERE id = $1', [id])
    if (currentResult.rows.length === 0) {
      res.status(404).json({ success: false, error: '申请不存在' })
      return
    }

    const current = currentResult.rows[0]
    const currentAuditStep = current.audit_step || 'pending'

    if (status === 'approved' && current.disease_type_id) {
      const duplicateCheckResult = await pool.query(
        'SELECT mada.*, dt.name as disease_name FROM mutual_aid_difficulty_applications mada JOIN disease_types dt ON mada.disease_type_id = dt.id WHERE mada.user_id = $1 AND mada.disease_type_id = $2 AND mada.id != $3',
        [current.user_id, current.disease_type_id, id]
      )

      if (duplicateCheckResult.rows.length > 0) {
        const diseaseName = duplicateCheckResult.rows[0].disease_name || '该病种'
        const existingStatus = duplicateCheckResult.rows[0].status
        let statusLabel = ''
        if (existingStatus === 'approved') {
          statusLabel = '已通过'
        } else if (existingStatus === 'pending') {
          statusLabel = '审核中'
        } else {
          statusLabel = existingStatus
        }
        res.status(400).json({ 
          success: false, 
          error: `该用户已有${diseaseName}的爱心帮扶申请（${statusLabel}），同一病种仅能申请一次` 
        })
        return
      }
    }

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

    const updates: string[] = []
    const params: unknown[] = []
    let nextStep = current.audit_step || 'pending'

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
    } else {
      if (userRole === 'grass_root_auditor') {
        nextStep = status === 'rejected' ? 'completed' : 'union_committee'
      } else if (userRole === 'union_committee_auditor') {
        nextStep = 'completed'
      } else if (userRole === 'admin') {
        if (status === 'rejected') {
          nextStep = 'completed'
        } else {
          if (currentAuditStep === 'pending' || currentAuditStep === 'grass_root') {
            nextStep = 'union_committee'
          } else if (currentAuditStep === 'union_committee') {
            nextStep = 'completed'
          }
        }
      }
    }

    if (status !== undefined) {
      params.push(status)
      updates.push(`status = $${params.length}`)
    }

    if (remark !== undefined) {
      params.push(remark || null)
      updates.push(`remark = $${params.length}`)
    }

    if (actual_amount !== undefined) {
      params.push(actual_amount || null)
      updates.push(`actual_amount = $${params.length}`)
    }

    params.push(userId)
    updates.push(`auditor_id = $${params.length}`)

    updates.push('updated_at = CURRENT_TIMESTAMP')

    if (nextStep !== current.audit_step) {
      params.push(nextStep)
      updates.push(`audit_step = $${params.length}`)
    }

    const query = `UPDATE mutual_aid_difficulty_applications SET ${updates.join(', ')} WHERE id = $${params.length + 1} RETURNING *`
    params.push(id)

    const result = await pool.query(query, params)

    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Update application error:', error)
    res.status(500).json({ success: false, error: '审批失败' })
  }
})

router.get('/disease-types', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM disease_types ORDER BY category, name')

    res.json({
      success: true,
      data: result.rows
    })
  } catch {
    res.status(500).json({ success: false, error: '获取病种列表失败' })
  }
})

router.get('/stats', authenticate, requireAdmin, async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    const [pendingResult, approvedResult, rejectedResult, totalAmountResult, categoryStats] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM mutual_aid_difficulty_applications WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) FROM mutual_aid_difficulty_applications WHERE status = 'approved'`),
      pool.query(`SELECT COUNT(*) FROM mutual_aid_difficulty_applications WHERE status = 'rejected'`),
      pool.query(`SELECT COALESCE(SUM(actual_amount), 0) as total FROM mutual_aid_difficulty_applications WHERE status = 'approved'`),
      pool.query(`SELECT difficulty_category, COUNT(*) as count, COALESCE(SUM(actual_amount), 0) as amount FROM mutual_aid_difficulty_applications WHERE status = 'approved' GROUP BY difficulty_category`),
    ])

    res.json({
      success: true,
      data: {
        pending: parseInt(pendingResult.rows[0].count),
        approved: parseInt(approvedResult.rows[0].count),
        rejected: parseInt(rejectedResult.rows[0].count),
        total_amount: parseFloat(totalAmountResult.rows[0].total),
        category_stats: categoryStats.rows,
      },
    })
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ success: false, error: '获取统计数据失败' })
  }
})

router.get('/categories', authenticate, async (req: Request, res: Response): Promise<void> => {
  const categories = [
    { value: 'disability', label: '伤残致困' },
    { value: 'accident', label: '意外致困' },
    { value: 'disease', label: '因病致困' },
    { value: 'education', label: '子女助学' },
    { value: 'special', label: '特殊困难' },
  ]
  res.json({ success: true, data: categories })
})

router.put('/applications/:id/mark-as-audited', authenticate, async (req: RequestWithUser, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const { marked_as_audited } = req.body

  try {
    const result = await pool.query(
      'UPDATE mutual_aid_difficulty_applications SET marked_as_audited = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
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
    console.error('Mutual aid difficulty mark as audited error:', error)
    res.status(500).json({ success: false, error: '标为已核失败' })
  }
})

router.put('/applications/batch/mark-as-audited', authenticate, async (req: RequestWithUser, res: Response): Promise<void> => {
  const { ids, marked_as_audited } = req.body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, error: '请选择要标记的申请' })
    return
  }

  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
    const result = await pool.query(
      `UPDATE mutual_aid_difficulty_applications SET marked_as_audited = $${ids.length + 1}, updated_at = CURRENT_TIMESTAMP WHERE id = ANY(ARRAY[${placeholders}]) RETURNING id`,
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
    console.error('Mutual aid difficulty batch mark as audited error:', error)
    res.status(500).json({ success: false, error: '批量标为已核失败' })
  }
})

export default router
