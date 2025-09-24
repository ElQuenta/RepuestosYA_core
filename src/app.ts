import express, { Application } from 'express';
import cors from 'cors';

import authRouter from './routes/authRoutes';
import catalogRouter from './routes/catalogRoutes';

const app: Application = express();

app.use(express.json());
app.use(cors());

app.use('/api/auth', authRouter);
app.use('/api/catalog', catalogRouter);

export default app