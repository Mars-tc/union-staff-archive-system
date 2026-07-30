import { Router, type Request, type Response } from 'express'
import pool from '../config/database.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM modules ORDER BY sort_order')
    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取模块列表失败' })
  }
})

router.get('/user/:userId', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt(req.params.userId)

  try {
    const result = await pool.query(
      'SELECT m.code FROM user_modules um JOIN modules m ON um.module_id = m.id WHERE um.user_id = $1',
      [userId]
    )
    const modules = result.rows.map((row: { code: string }) => row.code)

    res.json({
      success: true,
      data: modules
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户模块权限失败' })
  }
})

router.put('/user/:userId', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt(req.params.userId)
  const { modules } = req.body

  if (!modules || !Array.isArray(modules)) {
    res.status(400).json({ success: false, error: '请提供模块权限列表' })
    return
  }

  try {
    await pool.query('BEGIN')

    await pool.query('DELETE FROM user_modules WHERE user_id = $1', [userId])

    if (modules.length > 0) {
      const moduleCodes = modules as string[]
      const moduleIdsResult = await pool.query(
        'SELECT id FROM modules WHERE code IN (' + moduleCodes.map((_, i) => `$${i + 1}`).join(',') + ')',
        moduleCodes
      )
      const moduleIds = moduleIdsResult.rows.map((row: { id: number }) => row.id)

      for (const moduleId of moduleIds) {
        await pool.query(
          'INSERT INTO user_modules (user_id, module_id) VALUES ($1, $2)',
          [userId, moduleId]
        )
      }
    }

    await pool.query('COMMIT')

    const updatedResult = await pool.query(
      'SELECT m.code FROM user_modules um JOIN modules m ON um.module_id = m.id WHERE um.user_id = $1',
      [userId]
    )
    const updatedModules = updatedResult.rows.map((row: { code: string }) => row.code)

    res.json({
      success: true,
      data: updatedModules
    })
  } catch (error) {
    await pool.query('ROLLBACK')
    res.status(500).json({ success: false, error: '更新模块权限失败: ' + ((error as Error).message || '未知错误') })
  }
})

router.put('/user/batch', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { userIds, modules } = req.body

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    res.status(400).json({ success: false, error: '请提供用户ID列表' })
    return
  }

  if (!modules || !Array.isArray(modules)) {
    res.status(400).json({ success: false, error: '请提供模块权限列表' })
    return
  }

  try {
    await pool.query('BEGIN')

    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',')
    await pool.query(`DELETE FROM user_modules WHERE user_id IN (${placeholders})`, userIds)

    if (modules.length > 0) {
      const moduleCodes = modules as string[]
      const moduleIdsResult = await pool.query(
        'SELECT id FROM modules WHERE code IN (' + moduleCodes.map((_, i) => `$${i + 1}`).join(',') + ')',
        moduleCodes
      )
      const moduleIds = moduleIdsResult.rows.map((row: { id: number }) => row.id)

      for (const userId of userIds) {
        for (const moduleId of moduleIds) {
          await pool.query(
            'INSERT INTO user_modules (user_id, module_id) VALUES ($1, $2)',
            [userId, moduleId]
          )
        }
      }
    }

    await pool.query('COMMIT')

    res.json({
      success: true,
      data: {
        userIds,
        modules
      }
    })
  } catch (error) {
    await pool.query('ROLLBACK')
    res.status(500).json({ success: false, error: '批量更新模块权限失败: ' + ((error as Error).message || '未知错误') })
  }
})

export default router