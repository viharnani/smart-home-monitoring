import express from 'express';
import mqtt from 'mqtt';
import { DeviceDataProcessor } from './processors/DeviceDataProcessor';
import { LambdaPublisher } from './publishers/LambdaPublisher';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT || 3001;

// MQTT Client setup
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883');
const processor = new DeviceDataProcessor();
const publisher = new LambdaPublisher();

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('devices/+/data');
});

mqttClient.on('message', async (topic, message) => {
  try {
    const deviceId = topic.split('/')[1];
    const data = JSON.parse(message.toString());
    
    // Process device data
    const processedData = await processor.process({
      deviceId,
      timestamp: new Date(),
      ...data
    });

    // Publish to AWS Lambda
    await publisher.publish(processedData);
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

app.listen(port, () => {
  console.log(`Device service listening at http://localhost:${port}`);
});
