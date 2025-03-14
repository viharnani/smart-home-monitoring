# Setup Guide

## Prerequisites

1. **Node.js**: Install Node.js version 14 or higher
   - Download from: https://nodejs.org/

2. **MongoDB**: Install MongoDB Community Edition
   - Download from: https://www.mongodb.com/try/download/community

3. **MQTT Broker**: Install Mosquitto MQTT Broker
   - Download from: https://mosquitto.org/download/

## Initial Setup

1. **Clone the repository** (if you haven't already)
```bash
git clone <repository-url>
cd smart-home-energy-monitoring
```

2. **Set up environment variables**
```bash
# Copy the example env file for device service
cd services/device-service
copy .env.example .env
```

3. **Install dependencies**
```bash
# From the root directory
npm install
npm run install-all
```

4. **Start MongoDB**
```bash
# Start MongoDB service
# On Windows:
net start MongoDB

# On macOS/Linux:
sudo systemctl start mongod
```

5. **Start MQTT Broker**
```bash
# On Windows:
net start mosquitto

# On macOS/Linux:
sudo systemctl start mosquitto
```

## Running the Project

1. **Start all services in development mode**
```bash
npm run dev
```

2. **Or start services individually**
```bash
# Start device service
cd services/device-service
npm run dev
```

## Testing the Setup

1. **Check if device service is running**
   - Open browser and visit: http://localhost:3001/health
   - Should see: `{"status": "healthy"}`

2. **Test MQTT data ingestion**
   - Use MQTT client (like MQTT Explorer) to publish test data:
   - Topic: `devices/test-device-1/data`
   - Payload:
```json
{
  "power": 100,
  "voltage": 220,
  "current": 0.45,
  "frequency": 50,
  "powerFactor": 0.95
}
```

## Troubleshooting

1. **MongoDB Connection Issues**
   - Ensure MongoDB is running: `mongo` or `mongosh`
   - Check MongoDB URI in .env file

2. **MQTT Connection Issues**
   - Verify MQTT broker is running: `netstat -an | findstr "1883"`
   - Check MQTT credentials in .env file

3. **Port Conflicts**
   - Device Service: 3001
   - If ports are in use, modify in .env files 