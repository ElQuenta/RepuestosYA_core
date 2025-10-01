import express, { Application } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import catalogRoutes from './routes/catalogRoutes';

const app: Application = express();

app.use(express.json());
app.use(cors());
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);

export default app