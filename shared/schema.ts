import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  energyBudget: real("energy_budget").default(0),
});

export const deviceReadings = pgTable("device_readings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  consumption: real("consumption").notNull(),
  deviceId: text("device_id").notNull(),
});

export const deviceThresholds = pgTable("device_thresholds", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  deviceId: text("device_id").notNull(),
  dailyThreshold: real("daily_threshold").notNull(),
  weeklyThreshold: real("weekly_threshold"),
  monthlyThreshold: real("monthly_threshold"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  deviceId: text("device_id").notNull(),
  predictedConsumption: real("predicted_consumption").notNull(),
  confidence: real("confidence").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  timestamp: timestamp("timestamp").notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  isRead: boolean("is_read").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDeviceReadingSchema = createInsertSchema(deviceReadings);
export const insertDeviceThresholdSchema = createInsertSchema(deviceThresholds);
export const insertPredictionSchema = createInsertSchema(predictions);
export const insertAlertSchema = createInsertSchema(alerts);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type DeviceReading = typeof deviceReadings.$inferSelect;
export type DeviceThreshold = typeof deviceThresholds.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type Alert = typeof alerts.$inferSelect;