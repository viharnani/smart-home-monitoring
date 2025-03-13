import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";

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
              await checkEnergyBudget(userId, reading.consumption);
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

  // API Routes
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
