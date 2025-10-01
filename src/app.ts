import express, { Application } from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes';
import catalogRoutes from './routes/catalogRoutes';
import productRoutes from './routes/productRoutes';

const app: Application = express();

app.use(express.json());
app.use(cors());
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/products', productRoutes);

export default app