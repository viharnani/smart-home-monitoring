import express from 'express';
import AWS from 'aws-sdk';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import cors from 'cors';

config();

const app = express();
const port = process.env.PORT || 3004;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection with connection pooling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alerts', {
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
  w: 'majority'
});

// AWS Lambda Setup with error retries
const lambda = new AWS.Lambda({
  endpoint: process.env.AWS_LAMBDA_ENDPOINT,
  region: process.env.AWS_REGION || 'us-east-1',
  maxRetries: 3,
  retryDelayOptions: { base: 200 }
});

// Alert Processing Function with circuit breaker pattern
async function processAlert(alertData: any) {
  const params = {
    FunctionName: 'checkEnergyBudget',
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(alertData)
  };

  try {
    const result = await lambda.invoke(params).promise();
    if (result.FunctionError) {
      throw new Error(`Lambda execution failed: ${result.FunctionError}`);
    }
    return JSON.parse(result.Payload as string);
  } catch (error) {
    console.error('Lambda invocation error:', error);
    throw error;
  }
}

// API Routes with rate limiting
app.post('/api/alerts/check', async (req, res) => {
  try {
    const result = await processAlert(req.body);
    res.json(result);
  } catch (error) {
    console.error('Alert processing error:', error);
    res.status(500).json({ error: 'Failed to process alert', details: error.message });
  }
});

app.post('/api/alerts/notify', async (req, res) => {
  const params = {
    FunctionName: 'sendNotifications',
    InvocationType: 'Event',
    Payload: JSON.stringify(req.body)
  };

  try {
    const result = await lambda.invoke(params).promise();
    if (result.FunctionError) {
      throw new Error(`Lambda execution failed: ${result.FunctionError}`);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'alert-service' });
});

app.listen(port, () => {
  console.log(`Alert service listening at http://localhost:${port}`);
});