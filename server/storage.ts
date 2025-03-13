import { User, InsertUser, DeviceReading, Alert } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBudget(userId: number, budget: number): Promise<User>;
  addDeviceReading(reading: Omit<DeviceReading, "id">): Promise<DeviceReading>;
  getDeviceReadings(userId: number): Promise<DeviceReading[]>;
  createAlert(alert: Omit<Alert, "id">): Promise<Alert>;
  getAlerts(userId: number): Promise<Alert[]>;
  markAlertRead(alertId: number): Promise<void>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private readings: Map<number, DeviceReading>;
  private alerts: Map<number, Alert>;
  private currentId: { users: number; readings: number; alerts: number };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.readings = new Map();
    this.alerts = new Map();
    this.currentId = { users: 1, readings: 1, alerts: 1 };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
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
    const id = this.currentId.users++;
    const user: User = { ...insertUser, id, energyBudget: 0 };
    this.users.set(id, user);
    return user;
  }

  async updateUserBudget(userId: number, budget: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, energyBudget: budget };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async addDeviceReading(reading: Omit<DeviceReading, "id">): Promise<DeviceReading> {
    const id = this.currentId.readings++;
    const newReading = { ...reading, id };
    this.readings.set(id, newReading);
    return newReading;
  }

  async getDeviceReadings(userId: number): Promise<DeviceReading[]> {
    return Array.from(this.readings.values()).filter(
      (reading) => reading.userId === userId,
    );
  }

  async createAlert(alert: Omit<Alert, "id">): Promise<Alert> {
    const id = this.currentId.alerts++;
    const newAlert = { ...alert, id };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async getAlerts(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(
      (alert) => alert.userId === userId,
    );
  }

  async markAlertRead(alertId: number): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      this.alerts.set(alertId, { ...alert, read: true });
    }
  }
}

export const storage = new MemStorage();
