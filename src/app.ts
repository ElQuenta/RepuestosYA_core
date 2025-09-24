import express, { Application } from 'express';
import cors from 'cors';

import router from './routes/authRoutes';

const app: Application = express();

app.use(express.json());
app.use(cors());

app.use('/api/auth', router);

export default app