import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { updateBudgetSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Protected routes
  app.use("/api/energy", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    next();
  });

  app.post("/api/energy/budget", async (req, res) => {
    try {
      const { energyBudget } = updateBudgetSchema.parse(req.body);
      const user = await storage.updateUserBudget(req.user!.id, energyBudget);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid budget value" });
    }
  });

  app.get("/api/energy/readings", async (req, res) => {
    const readings = await storage.getDeviceReadings(req.user!.id);
    res.json(readings);
  });

  app.get("/api/energy/alerts", async (req, res) => {
    const alerts = await storage.getAlerts(req.user!.id);
    res.json(alerts);
  });

  app.post("/api/energy/alerts/:id/read", async (req, res) => {
    await storage.markAlertRead(parseInt(req.params.id));
    res.sendStatus(200);
  });

  // Mock device data generator
  function generateMockData(userId: number) {
    const deviceTypes = ["HVAC", "Lighting", "Kitchen", "Entertainment"];
    return {
      userId,
      timestamp: new Date(),
      consumption: Math.random() * 5,
      deviceType: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
    };
  }

  wss.on("connection", (ws) => {
    let interval: NodeJS.Timeout;

    ws.on("message", async (message) => {
      const data = JSON.parse(message.toString());
      if (data.type === "subscribe" && data.userId) {
        interval = setInterval(async () => {
          if (ws.readyState === WebSocket.OPEN) {
            const reading = await storage.addDeviceReading(
              generateMockData(data.userId)
            );
            
            const user = await storage.getUser(data.userId);
            if (user && user.energyBudget > 0) {
              const recentReadings = await storage.getDeviceReadings(data.userId);
              const totalConsumption = recentReadings
                .slice(-10)
                .reduce((sum, r) => sum + Number(r.consumption), 0);
              
              if (totalConsumption > Number(user.energyBudget)) {
                const alert = await storage.createAlert({
                  userId: data.userId,
                  message: `Energy consumption (${totalConsumption.toFixed(2)} kWh) has exceeded your budget of ${user.energyBudget} kWh`,
                  timestamp: new Date(),
                  read: false,
                });
                ws.send(JSON.stringify({ type: "alert", data: alert }));
              }
            }
            
            ws.send(JSON.stringify({ type: "reading", data: reading }));
          }
        }, 2000);
      }
    });

    ws.on("close", () => {
      if (interval) clearInterval(interval);
    });
  });

  return httpServer;
}
