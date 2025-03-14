import { Handler } from 'aws-lambda';
import mongoose from 'mongoose';
import { Alert } from '../models/Alert';

interface EnergyData {
  userId: string;
  consumption: number;
  budget: number;
  deviceId: string;
}

export const handler: Handler = async (event: EnergyData) => {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI!);

    const { userId, consumption, budget, deviceId } = event;

    if (consumption > budget) {
      // Create alert in MongoDB
      const alert = new Alert({
        userId,
        deviceId,
        type: 'BUDGET_EXCEEDED',
        message: `Energy consumption (${consumption.toFixed(2)} kWh) has exceeded budget of ${budget} kWh`,
        threshold: budget,
        currentValue: consumption,
        status: 'PENDING'
      });

      await alert.save();

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Alert created successfully',
          alert: alert
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Consumption within budget',
        exceeded: false
      })
    };
  } catch (error) {
    console.error('Error processing energy budget check:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing energy budget check',
        error: error
      })
    };
  }
};