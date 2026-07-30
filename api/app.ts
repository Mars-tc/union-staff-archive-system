import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import membershipRoutes from './routes/membership.js'
import feeRoutes from './routes/fee.js'
import difficultyRoutes from './routes/difficulty.js'
import mutualAidRoutes from './routes/mutualAid.js'
import mutualAidDifficultyRoutes from './routes/mutualAidDifficulty.js'
import userRoutes from './routes/users.js'
import tasksRoutes from './routes/tasks.js'
import logsRoutes from './routes/logs.js'
import modulesRoutes from './routes/modules.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api/auth', authRoutes)
app.use('/api/membership', membershipRoutes)
app.use('/api/fee', feeRoutes)
app.use('/api/difficulty', difficultyRoutes)
app.use('/api/mutual-aid', mutualAidRoutes)
app.use('/api/mutual-aid-difficulty', mutualAidDifficultyRoutes)
app.use('/api/users', userRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/logs', logsRoutes)
app.use('/api/modules', modulesRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
