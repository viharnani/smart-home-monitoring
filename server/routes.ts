import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { PredictionService } from "./services/prediction-service";

function generateMockReading(userId: number) {
  return {
    userId,
    timestamp: new Date(),
    consumption: Math.random() * 5 + 1, // 1-6 kWh
    deviceId: `device_${Math.floor(Math.random() * 3) + 1}`, // 3 mock devices
  };
}

async function checkEnergyBudget(userId: number, consumption: number) {
  const user = await storage.getUser(userId);
  if (!user || !user.energyBudget) return;
  
  const readings = await storage.getDeviceReadings(userId, 24); // Last 24 readings
  const totalConsumption = readings.reduce((sum, r) => sum + r.consumption, 0) + consumption;
  
  if (totalConsumption > user.energyBudget) {
    await storage.createAlert({
      userId,
      message: `Energy consumption (${totalConsumption.toFixed(2)} kWh) has exceeded your budget of ${user.energyBudget} kWh`,
      timestamp: new Date(),
      isRead: false
    });
  }
}

async function checkDeviceThresholds(userId: number, deviceId: string, consumption: number) {
  const thresholds = await storage.getDeviceThresholds(userId, deviceId);
  if (!thresholds.length) return;

  const threshold = thresholds[0];
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const startOfMonth = new Date(now.setDate(1));

  const dailyReadings = await storage.getDeviceReadingsByTimeRange(userId, deviceId, startOfDay, now);
  const dailyTotal = dailyReadings.reduce((sum, r) => sum + r.consumption, 0) + consumption;

  if (dailyTotal > threshold.dailyThreshold) {
    await storage.createAlert({
      userId,
      message: `Device ${deviceId} has exceeded daily threshold of ${threshold.dailyThreshold} kWh`,
      timestamp: new Date(),
      isRead: false
    });
  }

  if (threshold.weeklyThreshold) {
    const weeklyReadings = await storage.getDeviceReadingsByTimeRange(userId, deviceId, startOfWeek, now);
    const weeklyTotal = weeklyReadings.reduce((sum, r) => sum + r.consumption, 0) + consumption;

    if (weeklyTotal > threshold.weeklyThreshold) {
      await storage.createAlert({
        userId,
        message: `Device ${deviceId} has exceeded weekly threshold of ${threshold.weeklyThreshold} kWh`,
        timestamp: new Date(),
        isRead: false
      });
    }
  }

  if (threshold.monthlyThreshold) {
    const monthlyReadings = await storage.getDeviceReadingsByTimeRange(userId, deviceId, startOfMonth, now);
    const monthlyTotal = monthlyReadings.reduce((sum, r) => sum + r.consumption, 0) + consumption;

    if (monthlyTotal > threshold.monthlyThreshold) {
      await storage.createAlert({
        userId,
        message: `Device ${deviceId} has exceeded monthly threshold of ${threshold.monthlyThreshold} kWh`,
        timestamp: new Date(),
        isRead: false
      });
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    let userId: number | null = null;
    let interval: NodeJS.Timeout;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'init' && data.userId) {
          userId = data.userId;
          // Start sending mock readings every 5 seconds
          interval = setInterval(async () => {
            if (ws.readyState === ws.OPEN && userId) {
              const reading = generateMockReading(userId);
              const savedReading = await storage.addDeviceReading(reading);
              await checkDeviceThresholds(userId, reading.deviceId, reading.consumption);
              await checkEnergyBudget(userId, reading.consumption);

              // Generate prediction every hour
              if (new Date().getMinutes() === 0) {
                const prediction = await PredictionService.generatePrediction(userId, reading.deviceId);
                await storage.savePrediction({
                  userId,
                  deviceId: reading.deviceId,
                  predictedConsumption: prediction.predictedConsumption,
                  confidence: prediction.confidence,
                  recommendations: prediction.recommendations,
                  timestamp: new Date()
                });
              }

              ws.send(JSON.stringify({ type: 'reading', data: savedReading }));
            }
          }, 5000);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (interval) clearInterval(interval);
    });
  });

  // Device Thresholds API
  app.post('/api/devices/:deviceId/thresholds', async (req, res) => {
    try {
      const { deviceId } = req.params;
      const threshold = await storage.setDeviceThreshold({
        userId: parseInt(req.user!.id.toString()),
        deviceId,
        ...req.body
      });
      res.json(threshold);
    } catch (error) {
      res.status(500).json({ error: 'Failed to set device threshold' });
    }
  });

  app.get('/api/devices/thresholds', async (req, res) => {
    try {
      const thresholds = await storage.getDeviceThresholds(parseInt(req.user!.id.toString()));
      res.json(thresholds);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get device thresholds' });
    }
  });

  // Predictions API
  app.get('/api/devices/:deviceId/predictions', async (req, res) => {
    try {
      const { deviceId } = req.params;
      const predictions = await storage.getLatestPredictions(
        parseInt(req.user!.id.toString()),
        deviceId
      );
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get predictions' });
    }
  });

  app.get('/api/readings/:userId', async (req, res) => {
    const readings = await storage.getDeviceReadings(parseInt(req.params.userId));
    res.json(readings);
  });

  app.get('/api/alerts/:userId', async (req, res) => {
    const alerts = await storage.getAlerts(parseInt(req.params.userId));
    res.json(alerts);
  });

  app.post('/api/alerts/:alertId/read', async (req, res) => {
    await storage.markAlertRead(parseInt(req.params.alertId));
    res.sendStatus(200);
  });

  app.post('/api/users/:userId/budget', async (req, res) => {
    const { budget } = req.body;
    if (typeof budget !== 'number' || budget < 0) {
      return res.status(400).json({ message: 'Invalid budget value' });
    }
    await storage.updateUserBudget(parseInt(req.params.userId), budget);
    res.sendStatus(200);
  });

  return httpServer;
}