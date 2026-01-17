import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import warehouseRoutes from './routes/warehouse.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3011;

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve as any, swaggerUi.setup(swaggerSpec) as any);
// Main application routes
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/admin', adminRoutes);
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'warehouse-service' });
});


app.get('/', (req, res) => {
    res.send('Warehouse Service is running!');
});

app.listen(PORT, () => {
    console.log(`🚀 Warehouse Service listening on port ${PORT}`);
    console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
});