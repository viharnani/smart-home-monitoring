# Smart Home Energy Monitoring System - Setup & Run Guide

This guide will walk you through setting up and running the Smart Home Energy Monitoring System.

## Prerequisites

1. **Node.js**: Install Node.js version 14 or higher
   - Download from: https://nodejs.org/

2. **MongoDB**: Install MongoDB Community Edition
   - Download from: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud-hosted)

3. **MQTT Broker**: Install Mosquitto MQTT Broker
   - Download from: https://mosquitto.org/download/

## Step 1: Clone and Setup

1. **Navigate to your project directory**:
```bash
cd digitalBlanket
```

2. **Install root dependencies**:
```bash
npm install
```

## Step 2: Setup MongoDB

1. **Start MongoDB** (if using local installation):
```bash
# On Windows
net start MongoDB

# On macOS/Linux
sudo systemctl start mongod
```

2. **Verify MongoDB is running**:
```bash
# Connect to MongoDB shell
mongosh
# Or for older versions
mongo
```

## Step 3: Setup MQTT Broker

1. **Start Mosquitto MQTT Broker**:
```bash
# On Windows
net start mosquitto

# On macOS/Linux
sudo systemctl start mosquitto
```

2. **Verify MQTT broker is running**:
```bash
# Check if port 1883 is open
netstat -an | findstr "1883"
```

## Step 4: Configure Environment Variables

1. **Create .env file for device service**:
```bash
cd services/device-service
copy .env.example .env
```

2. **Edit the .env file** with your specific configuration:
```
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smart-home-energy
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=device_service
MQTT_PASSWORD=your_secure_password
```

## Step 5: Install Service Dependencies

1. **Install device service dependencies**:
```bash
cd services/device-service
npm install
```

2. **Install frontend dependencies**:
```bash
cd ../../frontend
npm install
```

## Step 6: Run the Services

1. **Start the device service**:
```bash
cd ../services/device-service
npm run dev
```

2. **In a new terminal, start the frontend**:
```bash
cd frontend
npm run dev
```

The frontend should now be running at: http://localhost:5173/

## Step 7: Test the System

1. **Generate test data** using the provided test script:
```bash
cd services/device-service
node src/test/test-mqtt-publish.js
```

2. **Test the API endpoints**:
```bash
cd services/device-service
node src/test/test-api.js
```

3. **Access the dashboard**:
   - Open your browser and navigate to: http://localhost:5173/
   - You should see the dashboard with real-time energy data

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check MongoDB connection string in `.env` file
- Try connecting manually: `mongosh`

### MQTT Connection Issues
- Verify Mosquitto is running
- Check MQTT broker URL and credentials in `.env` file
- Try a test connection using MQTT Explorer or another MQTT client

### API Connection Issues
- Ensure device service is running on port 3001
- Check browser console for CORS errors
- Verify API endpoints using Postman or similar tool

### Frontend Issues
- Check for JavaScript errors in browser console
- Ensure all dependencies are installed
- Verify Vite server is running correctly

## Next Steps

### Deploying to Kubernetes
To deploy the application to Kubernetes:

1. Build Docker images:
```bash
# Build device service image
docker build -t smart-home/device-service:latest ./services/device-service

# Build frontend image
docker build -t smart-home/frontend:latest ./frontend
```

2. Apply Kubernetes configurations:
```bash
kubectl apply -f kubernetes/device-service.yaml
kubectl apply -f kubernetes/frontend.yaml
```

### Deploying AWS Lambda Functions
To deploy the serverless functions:

1. Package each function:
```bash
cd serverless/processDeviceData
zip -r function.zip .
# Repeat for other functions
```

2. Deploy using AWS CLI or AWS Console
```bash
aws lambda create-function --function-name processDeviceData --runtime nodejs16.x --handler index.handler --zip-file fileb://function.zip --role arn:aws:iam::ACCOUNT_ID:role/lambda-role
``` 