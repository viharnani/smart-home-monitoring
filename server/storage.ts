import { User, DeviceReading, Alert, InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { users, deviceReadings, alerts } from "@shared/schema";

const PostgresSessionStore = connectPg(session);

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

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserBudget(userId: number, budget: number): Promise<void> {
    await db.update(users)
      .set({ energyBudget: budget })
      .where(eq(users.id, userId));
  }

  async addDeviceReading(reading: Omit<DeviceReading, "id">): Promise<DeviceReading> {
    const [newReading] = await db.insert(deviceReadings)
      .values(reading)
      .returning();
    return newReading;
  }

  async getDeviceReadings(userId: number, limit = 100): Promise<DeviceReading[]> {
    return await db.select()
      .from(deviceReadings)
      .where(eq(deviceReadings.userId, userId))
      .orderBy(deviceReadings.timestamp)
      .limit(limit);
  }

  async createAlert(alert: Omit<Alert, "id">): Promise<Alert> {
    const [newAlert] = await db.insert(alerts)
      .values(alert)
      .returning();
    return newAlert;
  }

  async getAlerts(userId: number): Promise<Alert[]> {
    return await db.select()
      .from(alerts)
      .where(eq(alerts.userId, userId))
      .orderBy(alerts.timestamp);
  }

  async markAlertRead(alertId: number): Promise<void> {
    await db.update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, alertId));
  }
}

export const storage = new DatabaseStorage();