import express from 'express';
import mongoose from 'mongoose';
import { Reading } from './models/Reading';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT || 3003;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/energy-data');

// Authentication middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API Routes
app.post('/api/readings', authenticateToken, async (req, res) => {
  try {
    const reading = new Reading({
      ...req.body,
      userId: req.user.id
    });
    await reading.save();
    res.status(201).json(reading);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save reading' });
  }
});

app.get('/api/readings', authenticateToken, async (req, res) => {
  try {
    const { start, end, deviceId } = req.query;
    const query: any = { userId: req.user.id };
    
    if (start || end) {
      query.timestamp = {};
      if (start) query.timestamp.$gte = new Date(start as string);
      if (end) query.timestamp.$lte = new Date(end as string);
    }
    
    if (deviceId) query.deviceId = deviceId;

    const readings = await Reading.find(query)
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

app.get('/api/readings/aggregate', authenticateToken, async (req, res) => {
  try {
    const { interval = 'hour' } = req.query;
    
    const aggregation = await Reading.aggregate([
      { $match: { userId: mongoose.Types.ObjectId.createFromHexString(req.user.id) } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: interval === 'day' ? '%Y-%m-%d' : '%Y-%m-%d-%H',
              date: '$timestamp'
            }
          },
          totalConsumption: { $sum: '$consumption' },
          avgVoltage: { $avg: '$voltage' },
          avgCurrent: { $avg: '$current' }
        }
      },
      { $sort: { '_id': -1 } },
      { $limit: 24 }
    ]);
    
    res.json(aggregation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to aggregate readings' });
  }
});

app.listen(port, () => {
  console.log(`Data service listening at http://localhost:${port}`);
});
