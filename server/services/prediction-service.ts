import { DeviceReading, Prediction } from "@shared/schema";
import { storage } from "../storage";

interface PredictionResult {
  predictedConsumption: number;
  confidence: number;
  recommendations: RecommendationType[];
}

interface RecommendationType {
  type: 'REDUCE_USAGE' | 'SCHEDULE_USAGE' | 'MAINTENANCE' | 'REPLACEMENT';
  message: string;
  potentialSavings: number;
}

export class PredictionService {
  private static readonly HOURS_FOR_PREDICTION = 24;

  static async generatePrediction(userId: number, deviceId: string): Promise<PredictionResult> {
    const now = new Date();
    const startDate = new Date(now.getTime() - (this.HOURS_FOR_PREDICTION * 60 * 60 * 1000));
    
    const readings = await storage.getDeviceReadingsByTimeRange(
      userId,
      deviceId,
      startDate,
      now
    );

    const prediction = this.calculatePrediction(readings);
    const recommendations = this.generateRecommendations(readings, prediction.predictedConsumption);

    return {
      ...prediction,
      recommendations
    };
  }

  private static calculatePrediction(readings: DeviceReading[]): Pick<PredictionResult, 'predictedConsumption' | 'confidence'> {
    if (readings.length === 0) {
      return { predictedConsumption: 0, confidence: 0 };
    }

    // Simple moving average prediction
    const sum = readings.reduce((acc, reading) => acc + reading.consumption, 0);
    const avg = sum / readings.length;
    
    // Calculate standard deviation for confidence
    const squaredDiffs = readings.map(reading => Math.pow(reading.consumption - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / readings.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // Convert stdDev to confidence score (0-1)
    const confidence = Math.max(0, Math.min(1, 1 - (stdDev / avg)));

    return {
      predictedConsumption: avg,
      confidence
    };
  }

  private static generateRecommendations(readings: DeviceReading[], predicted: number): RecommendationType[] {
    const recommendations: RecommendationType[] = [];
    const avgConsumption = readings.reduce((acc, r) => acc + r.consumption, 0) / readings.length;

    if (predicted > avgConsumption * 1.2) {
      recommendations.push({
        type: 'REDUCE_USAGE',
        message: 'Consumption trending higher than usual. Consider reducing usage during peak hours.',
        potentialSavings: (predicted - avgConsumption) * 0.2
      });
    }

    const peakHours = this.analyzePeakHours(readings);
    if (peakHours.length > 0) {
      recommendations.push({
        type: 'SCHEDULE_USAGE',
        message: `Consider rescheduling usage outside peak hours: ${peakHours.join(', ')}`,
        potentialSavings: avgConsumption * 0.15
      });
    }

    if (this.detectAnomalies(readings)) {
      recommendations.push({
        type: 'MAINTENANCE',
        message: 'Unusual consumption patterns detected. Device might need maintenance.',
        potentialSavings: avgConsumption * 0.1
      });
    }

    return recommendations;
  }

  private static analyzePeakHours(readings: DeviceReading[]): string[] {
    const hourlyUsage = new Map<number, number>();
    
    readings.forEach(reading => {
      const hour = new Date(reading.timestamp).getHours();
      hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + reading.consumption);
    });

    const avgUsage = Array.from(hourlyUsage.values()).reduce((a, b) => a + b, 0) / hourlyUsage.size;
    
    return Array.from(hourlyUsage.entries())
      .filter(([, usage]) => usage > avgUsage * 1.5)
      .map(([hour]) => `${hour}:00`);
  }

  private static detectAnomalies(readings: DeviceReading[]): boolean {
    if (readings.length < 2) return false;

    const consumptions = readings.map(r => r.consumption);
    const avg = consumptions.reduce((a, b) => a + b, 0) / consumptions.length;
    const stdDev = Math.sqrt(
      consumptions.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / consumptions.length
    );

    return consumptions.some(c => Math.abs(c - avg) > stdDev * 2);
  }
}
