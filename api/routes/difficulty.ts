import { Router, type Request, type Response } from 'express'
import pool from '../config/database.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import XLSX from 'xlsx'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

type RequestWithUser = Request & { user: { userId: number; role: string; union_member: boolean } }

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
  const { disease_type_id, amount, reason, signature, difficulty_category, family_income, family_members, bank_account, bank_name, bank_account_name, create_mutual_aid } = req.body

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
      'SELECT union_member, mutual_aid_member FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0 || !userResult.rows[0].union_member) {
      res.status(403).json({ 
        success: false, 
        error: '请先加入工会成为工会会员后再申请困难帮扶' 
      })
      return
    }

    if (disease_type_id) {
      const checkResult = await pool.query(
        'SELECT * FROM difficulty_applications WHERE user_id = $1 AND disease_type_id = $2',
        [userId, disease_type_id]
      )

      if (checkResult.rows.length > 0) {
        const diseaseResult = await pool.query('SELECT name FROM disease_types WHERE id = $1', [disease_type_id])
        const diseaseName = diseaseResult.rows[0]?.name || '该病种'
        res.status(400).json({ 
          success: false, 
          error: `${diseaseName}已申请过困难帮扶，同一病种仅能申请一次` 
        })
        return
      }
    }

    const result = await pool.query(
      'INSERT INTO difficulty_applications (user_id, disease_type_id, amount, reason, signature, difficulty_category, family_income, family_members, bank_account, bank_name, bank_account_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [userId, disease_type_id || null, amount, reason, signature, difficulty_category, family_income || null, family_members || null, bank_account || null, bank_name || null, bank_account_name || null]
    )

    let mutualAidApplication = null
    if (create_mutual_aid && userResult.rows[0].mutual_aid_member) {
      if (disease_type_id) {
        const mutualCheckResult = await pool.query(
          'SELECT * FROM mutual_aid_difficulty_applications WHERE user_id = $1 AND disease_type_id = $2',
          [userId, disease_type_id]
        )

        if (mutualCheckResult.rows.length === 0) {
          const mutualResult = await pool.query(
            'INSERT INTO mutual_aid_difficulty_applications (user_id, disease_type_id, amount, reason, signature, difficulty_category, family_income, family_members, bank_account, bank_name, bank_account_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [userId, disease_type_id || null, amount, reason, signature, difficulty_category, family_income || null, family_members || null, bank_account || null, bank_name || null, bank_account_name || null]
          )
          mutualAidApplication = mutualResult.rows[0]
        }
      } else {
        const mutualResult = await pool.query(
          'INSERT INTO mutual_aid_difficulty_applications (user_id, disease_type_id, amount, reason, signature, difficulty_category, family_income, family_members, bank_account, bank_name, bank_account_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
          [userId, null, amount, reason, signature, difficulty_category, family_income || null, family_members || null, bank_account || null, bank_name || null, bank_account_name || null]
        )
        mutualAidApplication = mutualResult.rows[0]
      }
    }

    res.status(201).json({
      success: true,
      data: result.rows[0],
      mutualAidApplication
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
      'SELECT user_id FROM difficulty_applications WHERE id = $1',
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
      'UPDATE difficulty_applications SET document_path = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
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
      'SELECT da.*, dt.name as disease_name FROM difficulty_applications da JOIN disease_types dt ON da.disease_type_id = dt.id WHERE da.user_id = $1 AND da.disease_type_id = $2',
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
      SELECT da.*, u.name, u.email, u.phone, dt.name as disease_name, dt.category as disease_category
      FROM difficulty_applications da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN disease_types dt ON da.disease_type_id = dt.id
    `
    const params: unknown[] = []

    if (status) {
      params.push(status)
      query += ` WHERE da.status = $${params.length}`
    }

    if (disease_type_id) {
      params.push(disease_type_id)
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} da.disease_type_id = $${params.length}`
    }

    if (difficulty_category) {
      params.push(difficulty_category)
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} da.difficulty_category = $${params.length}`
    }

    if (audit_step) {
      params.push(audit_step)
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} da.audit_step = $${params.length}`
    }

    if (marked_as_audited !== undefined && marked_as_audited !== '') {
      params.push(marked_as_audited === 'true')
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} da.marked_as_audited = $${params.length}`
    }

    if (user.role === 'employee') {
      params.push(user.userId)
      query += ` ${params.length > 1 ? 'AND' : 'WHERE'} da.user_id = $${params.length}`
    }

    query += ' ORDER BY da.created_at DESC'

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
      SELECT da.*, u.name, u.email, u.phone, dt.name as disease_name, dt.category as disease_category
      FROM difficulty_applications da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN disease_types dt ON da.disease_type_id = dt.id
      WHERE da.id = $1
    `
    const params: unknown[] = [id]

    if (user.role === 'employee') {
      params.push(user.userId)
      query += ` AND da.user_id = $${params.length}`
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

router.get('/user-applications', authenticate, async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user.userId

  try {
    const query = `
      SELECT da.*, dt.name as disease_name, dt.category as disease_category
      FROM difficulty_applications da
      LEFT JOIN disease_types dt ON da.disease_type_id = dt.id
      WHERE da.user_id = $1
      ORDER BY da.created_at DESC
    `

    const result = await pool.query(query, [userId])

    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Get user applications error:', error)
    res.status(500).json({ success: false, error: '获取申请记录失败' })
  }
})

router.get('/records', authenticate, async (req: RequestWithUser, res: Response): Promise<void> => {
  const user = req.user

  if (!user.union_member) {
    res.status(403).json({ success: false, error: '非工会会员无法查看困难职工档案' })
    return
  }

  try {
    let query = `
      SELECT u.id as user_id, u.name, u.email, u.phone, u.department,
             ARRAY_AGG(
               JSON_BUILD_OBJECT(
                 'application_id', da.id,
                 'disease_name', dt.name,
                 'category', dt.category,
                 'amount', da.amount,
                 'reason', da.reason,
                 'status', da.status,
                 'created_at', da.created_at,
                 'difficulty_category', da.difficulty_category,
                 'actual_amount', da.actual_amount,
                 'audit_step', da.audit_step,
                 'family_income', da.family_income,
                 'personal_income', da.personal_income,
                 'dependents_count', da.dependents_count,
                 'is_retired', da.is_retired,
                 'is_one_time', da.is_one_time,
                 'apply_count', da.apply_count,
                 'employee_id', da.employee_id,
                 'applied_before', da.applied_before,
                 'remark', da.remark
               )
             ) as applications
      FROM users u
      INNER JOIN difficulty_applications da ON u.id = da.user_id AND da.status = 'approved'
      INNER JOIN disease_types dt ON da.disease_type_id = dt.id
    `
    const params: unknown[] = []

    if (user.role === 'employee') {
      params.push(user.userId)
      query += ` WHERE u.id = $${params.length}`
    }

    query += ` GROUP BY u.id, u.name, u.email, u.phone, u.department ORDER BY u.name`

    const result = await pool.query(query, params)

    res.json({
      success: true,
      data: result.rows
    })
  } catch {
    res.status(500).json({ success: false, error: '获取档案列表失败' })
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

    const currentResult = await pool.query('SELECT * FROM difficulty_applications WHERE id = $1', [id])
    if (currentResult.rows.length === 0) {
      res.status(404).json({ success: false, error: '申请不存在' })
      return
    }

    const current = currentResult.rows[0]
    const currentAuditStep = current.audit_step || 'pending'

    if (status === 'approved' && current.disease_type_id) {
      const duplicateCheckResult = await pool.query(
        'SELECT da.*, dt.name as disease_name FROM difficulty_applications da JOIN disease_types dt ON da.disease_type_id = dt.id WHERE da.user_id = $1 AND da.disease_type_id = $2 AND da.id != $3',
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
          error: `该用户已有${diseaseName}的困难帮扶申请（${statusLabel}），同一病种仅能申请一次` 
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

    const query = `UPDATE difficulty_applications SET ${updates.join(', ')} WHERE id = $${params.length + 1} RETURNING *`
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
      pool.query(`SELECT COUNT(*) FROM difficulty_applications WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) FROM difficulty_applications WHERE status = 'approved'`),
      pool.query(`SELECT COUNT(*) FROM difficulty_applications WHERE status = 'rejected'`),
      pool.query(`SELECT COALESCE(SUM(actual_amount), 0) as total FROM difficulty_applications WHERE status = 'approved'`),
      pool.query(`SELECT difficulty_category, COUNT(*) as count, COALESCE(SUM(actual_amount), 0) as amount FROM difficulty_applications WHERE status = 'approved' GROUP BY difficulty_category`),
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

const categoryMap: { [key: string]: string } = {
  '伤残致困': 'disability',
  '意外致困': 'accident',
  '因病致困': 'disease',
  '子女助学': 'education',
  '特殊困难': 'special',
}

const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

router.post('/import/preview', authenticate, requireAdmin, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, error: '请选择文件' })
    return
  }

  try {
    const fileBuffer = fs.readFileSync(req.file.path)
    fs.unlinkSync(req.file.path)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>

    if (data.length === 0) {
      res.status(400).json({ success: false, error: 'Excel文件为空' })
      return
    }

    const headers = Object.keys(data[0])
    const requiredHeaders = ['姓名', '员工编码/身份证号', '所属单位', '联系电话']
    const missingHeaders = requiredHeaders.filter(h => !headers.some(header => String(header).includes(h)))

    if (missingHeaders.length > 0) {
      res.status(400).json({ success: false, error: `缺少必要字段: ${missingHeaders.join(', ')}` })
      return
    }

    const matchedRows: Array<{ row: number; name: string; employeeId: string; phone: string; department: string; userId: number }> = []
    const unmatchedRows: Array<{ row: number; name: string; employeeId: string; phone: string; department: string }> = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 2

      const name = String(row['姓名'] || row['name'] || '')
      const employeeId = String(row['员工编码/身份证号'] || row['employee_id'] || row['id_card'] || '')
      const department = String(row['所属单位'] || row['department'] || '')
      const phone = String(row['联系电话'] || row['phone'] || '')

      if (!name || !employeeId) {
        continue
      }

      let userId: number | null = null

      if (phone) {
        const phoneResult = await pool.query('SELECT id FROM users WHERE phone = $1', [phone])
        if (phoneResult.rows.length > 0) {
          userId = phoneResult.rows[0].id
        }
      }

      if (!userId && employeeId) {
        const employeeResult = await pool.query('SELECT id FROM users WHERE email = $1', [`${employeeId}@union.com`])
        if (employeeResult.rows.length > 0) {
          userId = employeeResult.rows[0].id
        }
      }

      if (userId) {
        matchedRows.push({ row: rowNum, name, employeeId, phone, department, userId })
      } else {
        unmatchedRows.push({ row: rowNum, name, employeeId, phone, department })
      }
    }

    res.json({
      success: true,
      data: {
        total: data.length,
        matched: matchedRows.length,
        unmatched: unmatchedRows.length,
        matchedRows,
        unmatchedRows,
      },
    })
  } catch (error) {
    console.error('Preview error:', error)
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch {
      }
    }
    res.status(500).json({ success: false, error: '预览失败: ' + ((error as Error).message || '未知错误') })
  }
})

router.post('/import', authenticate, requireAdmin, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, error: '请选择文件' })
    return
  }

  const createUsers = req.body.createUsers === 'true' || req.body.createUsers === true

  try {
    const fileBuffer = fs.readFileSync(req.file.path)
    fs.unlinkSync(req.file.path)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>

    if (data.length === 0) {
      res.status(400).json({ success: false, error: 'Excel文件为空' })
      return
    }

    const headers = Object.keys(data[0])
    const requiredHeaders = ['姓名', '员工编码/身份证号', '所属单位', '联系电话']
    const missingHeaders = requiredHeaders.filter(h => !headers.some(header => String(header).includes(h)))

    if (missingHeaders.length > 0) {
      res.status(400).json({ success: false, error: `缺少必要字段: ${missingHeaders.join(', ')}` })
      return
    }

    const results: Array<{ success: boolean; message: string; row: number; createdUser?: { name: string; email: string; password: string; employeeId: string; department: string } }> = []
    let successCount = 0
    let failCount = 0

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      let diseaseTypeId: number
      const diseaseResult = await client.query("SELECT id FROM disease_types WHERE name = '其他疾病' LIMIT 1")
      if (diseaseResult.rows.length > 0) {
        diseaseTypeId = diseaseResult.rows[0].id
      } else {
        const fallbackResult = await client.query('SELECT id FROM disease_types ORDER BY id LIMIT 1')
        if (fallbackResult.rows.length > 0) {
          diseaseTypeId = fallbackResult.rows[0].id
        } else {
          const createResult = await client.query(
            "INSERT INTO disease_types (name) VALUES ($1) RETURNING id",
            ['其他疾病']
          )
          diseaseTypeId = createResult.rows[0].id
        }
      }

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNum = i + 2

        try {
          await client.query('SAVEPOINT sp_' + rowNum)

          const name = String(row['姓名'] || row['name'] || '')
          const employeeId = String(row['员工编码/身份证号'] || row['employee_id'] || row['id_card'] || '')
          const department = String(row['所属单位'] || row['department'] || '')
          const phone = String(row['联系电话'] || row['phone'] || '')
          const familyIncome = parseFloat(String(row['家庭年收入（万元）'] || row['family_income'] || row['family_income_wan'] || 0)) * 10000
          const personalIncome = parseFloat(String(row['个人年收入（万元）'] || row['personal_income'] || row['personal_income_wan'] || 0)) * 10000
          const dependentsCount = parseInt(String(row['需要抚养人数'] || row['dependents_count'] || 0)) || 0
          const isRetired = ['是', 'true', '1', '退休', '已退休'].includes(String(row['是否退休'] || row['is_retired'] || '').trim())
          const appliedBefore = ['是', 'true', '1', '申请过'].includes(String(row['是否申请过困难帮扶'] || row['applied_before'] || '').trim())
          const categoryLabel = String(row['困难帮扶申请类别'] || row['difficulty_category'] || '')
          const difficultyCategory = categoryMap[categoryLabel] || 'other'
          const reason = String(row['申请原因'] || row['reason'] || '')
          const isOneTime = ['是', 'true', '1', '一次性'].includes(String(row['是否属于一次性领取'] || row['is_one_time'] || '').trim())
          const amount = parseFloat(String(row['困难帮扶金额（元）'] || row['amount'] || row['amount_yuan'] || 0))
          const applyCount = parseInt(String(row['帮扶次数'] || row['apply_count'] || 0)) || 0
          const remark = String(row['备注'] || row['remark'] || '')

          if (!name || !employeeId) {
            results.push({ success: false, message: '姓名和员工编码不能为空', row: rowNum })
            failCount++
            await client.query('ROLLBACK TO SAVEPOINT sp_' + rowNum)
            continue
          }

          let userId: number | null = null
          let existingUser = null

          if (phone) {
            const phoneResult = await client.query('SELECT id, department FROM users WHERE phone = $1', [phone])
            if (phoneResult.rows.length > 0) {
              userId = phoneResult.rows[0].id
              existingUser = phoneResult.rows[0]
            }
          }

          if (!userId && employeeId) {
            const employeeResult = await client.query('SELECT id, department FROM users WHERE email = $1', [`${employeeId}@union.com`])
            if (employeeResult.rows.length > 0) {
              userId = employeeResult.rows[0].id
              existingUser = employeeResult.rows[0]
            }
          }

          let createdUserInfo: { name: string; email: string; password: string; employeeId: string; department: string } | undefined

          if (!userId) {
            if (!createUsers) {
              results.push({ success: false, message: `未找到用户: ${name}，且未选择自动创建用户`, row: rowNum })
              failCount++
              await client.query('ROLLBACK TO SAVEPOINT sp_' + rowNum)
              continue
            }

            const password = generatePassword()
            const hashedPassword = bcrypt.hashSync(password, 10)
            const email = `${employeeId}@union.com`

            const createResult = await client.query(
              'INSERT INTO users (email, password, name, phone, department, role, union_member) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
              [email, hashedPassword, name, phone || null, department || null, 'employee', true]
            )
            userId = createResult.rows[0].id

            createdUserInfo = { name, email, password, employeeId, department }
          } else if (department && (!existingUser || existingUser.department !== department)) {
            await client.query('UPDATE users SET department = $1 WHERE id = $2', [department, userId])
          }

          const status = appliedBefore ? 'approved' : 'pending'
          const auditStep = appliedBefore ? 'completed' : 'pending'

          await client.query(
            'INSERT INTO difficulty_applications (user_id, disease_type_id, amount, reason, status, difficulty_category, family_income, personal_income, dependents_count, is_retired, is_one_time, apply_count, employee_id, applied_before, remark, audit_step) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)',
            [userId, diseaseTypeId, amount, reason || null, status, difficultyCategory, familyIncome || null, personalIncome || null, dependentsCount || null, isRetired, isOneTime, applyCount, employeeId, appliedBefore, remark || null, auditStep]
          )

          results.push({ 
            success: true, 
            message: createdUserInfo ? `导入成功: ${name}（已创建用户）` : `导入成功: ${name}`, 
            row: rowNum,
            createdUser: createdUserInfo
          })
          successCount++
        } catch (rowError) {
          results.push({ success: false, message: `导入失败: ${(rowError as Error).message}`, row: rowNum })
          failCount++
          await client.query('ROLLBACK TO SAVEPOINT sp_' + (i + 2))
        }
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    res.json({
      success: true,
      data: {
        total: data.length,
        success: successCount,
        failed: failCount,
        details: results,
      },
    })
  } catch (error) {
    console.error('Import error:', error)
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch {
      }
    }
    res.status(500).json({ success: false, error: '导入失败: ' + ((error as Error).message || '未知错误') })
  }
})

router.put('/applications/:id/mark-as-audited', authenticate, async (req: RequestWithUser, res: Response): Promise<void> => {
  const id = parseInt(req.params.id)
  const { marked_as_audited } = req.body

  try {
    const result = await pool.query(
      'UPDATE difficulty_applications SET marked_as_audited = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
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
    console.error('Difficulty mark as audited error:', error)
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
      `UPDATE difficulty_applications SET marked_as_audited = $${ids.length + 1}, updated_at = CURRENT_TIMESTAMP WHERE id = ANY(ARRAY[${placeholders}]) RETURNING id`,
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
    console.error('Difficulty batch mark as audited error:', error)
    res.status(500).json({ success: false, error: '批量标为已核失败' })
  }
})

export default router