import { Router, type Request, type Response } from 'express'
import pool from '../config/database.js'
import { authenticate, requireAdmin, requireAnyAuditor } from '../middleware/auth.js'

const router = Router()

interface TaskWithStep {
  id: number
  type: string
  typeName: string
  name: string
  email: string
  phone: string
  extraInfo: string
  status?: string
  createdAt: string
  updatedAt?: string
  stepInfo: string
}

router.get('/todo', authenticate, requireAnyAuditor, async (req: Request, res: Response): Promise<void> => {
  try {
    const membershipResult = await pool.query(
      `SELECT ma.id, ma.created_at, ma.audit_step, ma.grass_root_opinion, ma.union_committee_opinion,
              ma.position, u.name, u.email, u.phone
       FROM membership_applications ma
       LEFT JOIN users u ON ma.user_id = u.id
       WHERE ma.status = 'pending'
       ORDER BY ma.created_at DESC`,
    )

    const mutualAidResult = await pool.query(
      `SELECT ma.id, ma.created_at, ma.work_group_opinion, ma.office_opinion,
              ma.department, ma.position, u.name, u.email, u.phone
       FROM mutual_aid_applications ma
       LEFT JOIN users u ON ma.user_id = u.id
       WHERE ma.status = 'pending'
       ORDER BY ma.created_at DESC`,
    )

    const difficultyResult = await pool.query(
      `SELECT da.id, da.created_at, da.amount, da.status, dt.name as disease_name, u.name, u.email, u.phone
       FROM difficulty_applications da
       LEFT JOIN users u ON da.user_id = u.id
       LEFT JOIN disease_types dt ON da.disease_type_id = dt.id
       WHERE da.status = 'pending'
       ORDER BY da.created_at DESC`,
    )

    console.log('Todo query raw results:', {
      membershipRows: membershipResult.rows,
      mutualAidRows: mutualAidResult.rows,
      difficultyRows: difficultyResult.rows,
    })

    const todoTasks: TaskWithStep[] = []

    for (const row of membershipResult.rows) {
      const steps: string[] = []
      if (row.grass_root_opinion || row.audit_step === 'grass_root') steps.push('基层审核')
      if (row.union_committee_opinion || row.audit_step === 'union_committee') steps.push('委员会审核')
      if (row.audit_step === 'completed') steps.push('已完成')

      todoTasks.push({
        id: row.id,
        type: 'membership',
        typeName: '入会申请',
        name: row.name || '未知用户',
        email: row.email || '',
        phone: row.phone || '',
        extraInfo: row.position || '',
        createdAt: row.created_at,
        stepInfo: steps.length > 0 ? steps.join(' -> ') : '待审核',
      })
    }

    for (const row of mutualAidResult.rows) {
      const steps: string[] = []
      if (row.work_group_opinion) steps.push('工作小组审核')
      if (row.office_opinion) steps.push('办公室审核')
      if ((row.work_group_opinion || row.office_opinion) && row.status !== 'pending') steps.push('已完成')

      todoTasks.push({
        id: row.id,
        type: 'mutual_aid',
        typeName: '爱心互助会',
        name: row.name || '未知用户',
        email: row.email || '',
        phone: row.phone || '',
        extraInfo: `${row.department} | ${row.position}`,
        createdAt: row.created_at,
        stepInfo: steps.length > 0 ? steps.join(' -> ') : '待审核',
      })
    }

    for (const row of difficultyResult.rows) {
      let stepInfo = '待审批'
      if (row.status === 'approved') stepInfo = '已审批通过'
      else if (row.status === 'rejected') stepInfo = '已审批拒绝'

      todoTasks.push({
        id: row.id,
        type: 'difficulty',
        typeName: '困难帮扶',
        name: row.name || '未知用户',
        email: row.email || '',
        phone: row.phone || '',
        extraInfo: `${row.disease_name || '未知疾病'} | ${String(row.amount)}元`,
        status: row.status,
        createdAt: row.created_at,
        stepInfo,
      })
    }

    todoTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log('Final todo tasks:', todoTasks)

    res.json({
      success: true,
      data: todoTasks,
    })
  } catch (error) {
    console.error('Get todo tasks error:', error)
    res.status(500).json({ success: false, error: '获取待办任务失败' })
  }
})

router.get('/done', authenticate, requireAnyAuditor, async (req: Request, res: Response): Promise<void> => {
  try {
    const membershipResult = await pool.query(
      `SELECT ma.id, ma.created_at, ma.updated_at, ma.audit_step, ma.grass_root_opinion, ma.union_committee_opinion,
              ma.position, ma.status, u.name, u.email, u.phone
       FROM membership_applications ma
       LEFT JOIN users u ON ma.user_id = u.id
       WHERE ma.status IN ('approved', 'rejected')
       ORDER BY ma.updated_at DESC NULLS LAST`,
    )

    const mutualAidResult = await pool.query(
      `SELECT ma.id, ma.created_at, ma.updated_at, ma.work_group_opinion, ma.office_opinion,
              ma.department, ma.position, ma.status, u.name, u.email, u.phone
       FROM mutual_aid_applications ma
       LEFT JOIN users u ON ma.user_id = u.id
       WHERE ma.status IN ('approved', 'rejected')
       ORDER BY ma.updated_at DESC NULLS LAST`,
    )

    const difficultyResult = await pool.query(
      `SELECT da.id, da.created_at, da.updated_at, da.amount, da.status, dt.name as disease_name, u.name, u.email, u.phone
       FROM difficulty_applications da
       LEFT JOIN users u ON da.user_id = u.id
       LEFT JOIN disease_types dt ON da.disease_type_id = dt.id
       WHERE da.status IN ('approved', 'rejected')
       ORDER BY da.updated_at DESC NULLS LAST`,
    )

    console.log('Done query raw results:', {
      membershipRows: membershipResult.rows,
      mutualAidRows: mutualAidResult.rows,
      difficultyRows: difficultyResult.rows,
    })

    const doneTasks: TaskWithStep[] = []

    for (const row of membershipResult.rows) {
      const steps: string[] = []
      if (row.grass_root_opinion || row.audit_step === 'grass_root') steps.push('基层审核')
      if (row.union_committee_opinion || row.audit_step === 'union_committee') steps.push('委员会审核')
      if (row.audit_step === 'completed') steps.push('已完成')

      doneTasks.push({
        id: row.id,
        type: 'membership',
        typeName: '入会申请',
        name: row.name || '未知用户',
        email: row.email || '',
        phone: row.phone || '',
        extraInfo: row.position || '',
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        stepInfo: steps.length > 0 ? steps.join(' -> ') : '待审核',
      })
    }

    for (const row of mutualAidResult.rows) {
      const steps: string[] = []
      if (row.work_group_opinion) steps.push('工作小组审核')
      if (row.office_opinion) steps.push('办公室审核')
      if ((row.work_group_opinion || row.office_opinion) && row.status !== 'pending') steps.push('已完成')

      doneTasks.push({
        id: row.id,
        type: 'mutual_aid',
        typeName: '爱心互助会',
        name: row.name || '未知用户',
        email: row.email || '',
        phone: row.phone || '',
        extraInfo: `${row.department} | ${row.position}`,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        stepInfo: steps.length > 0 ? steps.join(' -> ') : '待审核',
      })
    }

    for (const row of difficultyResult.rows) {
      let stepInfo = '待审批'
      if (row.status === 'approved') stepInfo = '已审批通过'
      else if (row.status === 'rejected') stepInfo = '已审批拒绝'

      doneTasks.push({
        id: row.id,
        type: 'difficulty',
        typeName: '困难帮扶',
        name: row.name || '未知用户',
        email: row.email || '',
        phone: row.phone || '',
        extraInfo: `${row.disease_name || '未知疾病'} | ${String(row.amount)}元`,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        stepInfo,
      })
    }

    doneTasks.sort((a, b) => {
      const aDate = a.updatedAt ? new Date(a.updatedAt) : new Date(a.createdAt)
      const bDate = b.updatedAt ? new Date(b.updatedAt) : new Date(b.createdAt)
      return bDate.getTime() - aDate.getTime()
    })

    console.log('Final done tasks:', doneTasks)

    res.json({
      success: true,
      data: doneTasks,
    })
  } catch (error) {
    console.error('Get done tasks error:', error)
    res.status(500).json({ success: false, error: '获取已办任务失败' })
  }
})

router.get('/stats', authenticate, requireAnyAuditor, async (req: Request, res: Response): Promise<void> => {
  try {
    const [membershipTodo, membershipDone, mutualAidTodo, mutualAidDone, difficultyTodo, difficultyDone, mutualAidDifficultyTodo, mutualAidDifficultyDone] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM membership_applications WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) FROM membership_applications WHERE status IN ('approved', 'rejected')`),
      pool.query(`SELECT COUNT(*) FROM mutual_aid_applications WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) FROM mutual_aid_applications WHERE status IN ('approved', 'rejected')`),
      pool.query(`SELECT COUNT(*) FROM difficulty_applications WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) FROM difficulty_applications WHERE status IN ('approved', 'rejected')`),
      pool.query(`SELECT COUNT(*) FROM mutual_aid_difficulty_applications WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) FROM mutual_aid_difficulty_applications WHERE status IN ('approved', 'rejected')`),
    ])

    const membershipTodoCount = parseInt(membershipTodo.rows[0].count)
    const mutualAidTodoCount = parseInt(mutualAidTodo.rows[0].count)
    const difficultyTodoCount = parseInt(difficultyTodo.rows[0].count)
    const mutualAidDifficultyTodoCount = parseInt(mutualAidDifficultyTodo.rows[0].count)

    const membershipDoneCount = parseInt(membershipDone.rows[0].count)
    const mutualAidDoneCount = parseInt(mutualAidDone.rows[0].count)
    const difficultyDoneCount = parseInt(difficultyDone.rows[0].count)
    const mutualAidDifficultyDoneCount = parseInt(mutualAidDifficultyDone.rows[0].count)

    res.json({
      success: true,
      data: {
        todo: {
          total: membershipTodoCount + mutualAidTodoCount + difficultyTodoCount + mutualAidDifficultyTodoCount,
          membership: membershipTodoCount,
          mutualAid: mutualAidTodoCount,
          difficulty: difficultyTodoCount,
          mutualAidDifficulty: mutualAidDifficultyTodoCount,
        },
        done: {
          total: membershipDoneCount + mutualAidDoneCount + difficultyDoneCount + mutualAidDifficultyDoneCount,
          membership: membershipDoneCount,
          mutualAid: mutualAidDoneCount,
          difficulty: difficultyDoneCount,
          mutualAidDifficulty: mutualAidDifficultyDoneCount,
        },
      },
    })
  } catch (error) {
    console.error('Get tasks stats error:', error)
    res.status(500).json({ success: false, error: '获取任务统计失败' })
  }
})

export default router