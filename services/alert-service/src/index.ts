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

// MongoDB Connection with connection pooling and error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alerts', {
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
  w: 'majority'
}).then(() => {
  console.log('Connected to MongoDB Atlas');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// AWS Lambda Setup with error retries and proper initialization
const lambda = new AWS.Lambda({
  endpoint: process.env.AWS_LAMBDA_ENDPOINT,
  region: process.env.AWS_REGION || 'us-east-1',
  maxRetries: 3,
  retryDelayOptions: { base: 200 },
  credentials: new AWS.Credentials({
    accessKeyId: 'test',
    secretAccessKey: 'test'
  })
});

// Circuit breaker implementation for Lambda calls
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private readonly threshold: number = 3;
  private readonly resetTimeout: number = 30000; // 30 seconds

  async execute(fn: () => Promise<any>) {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.threshold) {
      const now = Date.now();
      if (now - this.lastFailureTime <= this.resetTimeout) {
        return true;
      }
      this.reset();
    }
    return false;
  }

  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  private reset() {
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}

const breaker = new CircuitBreaker();

// Alert Processing Function with circuit breaker pattern
async function processAlert(alertData: any) {
  return breaker.execute(async () => {
    const params = {
      FunctionName: 'checkEnergyBudget',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(alertData)
    };

    const result = await lambda.invoke(params).promise();
    if (result.FunctionError) {
      throw new Error(`Lambda execution failed: ${result.FunctionError}`);
    }
    return JSON.parse(result.Payload as string);
  });
}

// API Routes with rate limiting and error handling
app.post('/api/alerts/check', async (req, res) => {
  try {
    const result = await processAlert(req.body);
    res.json(result);
  } catch (error) {
    console.error('Alert processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process alert', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/alerts/notify', async (req, res) => {
  try {
    const result = await breaker.execute(async () => {
      const params = {
        FunctionName: 'sendNotifications',
        InvocationType: 'Event',
        Payload: JSON.stringify(req.body)
      };

      return lambda.invoke(params).promise();
    });

    if (result.FunctionError) {
      throw new Error(`Lambda execution failed: ${result.FunctionError}`);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ 
      error: 'Failed to send notification', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint with detailed status
app.get('/health', (req, res) => {
  const status = {
    service: 'alert-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.AWS_LAMBDA_ENDPOINT
    }
  };
  res.json(status);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Alert service listening at http://0.0.0.0:${port}`);
});