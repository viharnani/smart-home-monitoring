import { User, DeviceReading, Alert, InsertUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBudget(userId: number, budget: number): Promise<void>;
  
  addDeviceReading(reading: Omit<DeviceReading, "id">): Promise<DeviceReading>;
  getDeviceReadings(userId: number, limit?: number): Promise<DeviceReading[]>;
  
  createAlert(alert: Omit<Alert, "id">): Promise<Alert>;
  getAlerts(userId: number): Promise<Alert[]>;
  markAlertRead(alertId: number): Promise<void>;
  
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private deviceReadings: Map<number, DeviceReading>;
  private alerts: Map<number, Alert>;
  sessionStore: session.SessionStore;
  private currentIds: { user: number; reading: number; alert: number };

  constructor() {
    this.users = new Map();
    this.deviceReadings = new Map();
    this.alerts = new Map();
    this.currentIds = { user: 1, reading: 1, alert: 1 };
    this.sessionStore = new MemoryStore({ checkPeriod: 86400000 });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.user++;
    const user: User = { ...insertUser, id, energyBudget: 0 };
    this.users.set(id, user);
    return user;
  }

  async updateUserBudget(userId: number, budget: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    user.energyBudget = budget;
    this.users.set(userId, user);
  }

  async addDeviceReading(reading: Omit<DeviceReading, "id">): Promise<DeviceReading> {
    const id = this.currentIds.reading++;
    const newReading = { ...reading, id };
    this.deviceReadings.set(id, newReading);
    return newReading;
  }

  async getDeviceReadings(userId: number, limit = 100): Promise<DeviceReading[]> {
    return Array.from(this.deviceReadings.values())
      .filter(reading => reading.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createAlert(alert: Omit<Alert, "id">): Promise<Alert> {
    const id = this.currentIds.alert++;
    const newAlert = { ...alert, id };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async getAlerts(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async markAlertRead(alertId: number): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error("Alert not found");
    alert.isRead = true;
    this.alerts.set(alertId, alert);
  }
}

export const storage = new MemStorage();
