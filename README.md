
# Smart Home Energy Monitoring IoT Application

A comprehensive smart home energy monitoring system built with MERN stack (MongoDB, Express.js, React.js, Node.js), microservices architecture, and serverless functions via AWS Lambda.

## Architecture

### Microservices
- **Device Service**: Handles ingestion of data from smart devices via MQTT or HTTP
- **User Service**: Manages user authentication (OAuth 2.0), profiles, and preferences
- **Data Service**: Stores and retrieves energy usage data using MongoDB
- **Alert Service**: Monitors energy budgets and triggers alerts
- **Visualization Service**: Provides RESTful APIs for data visualization

### Serverless Components
- AWS Lambda Functions for data processing, budget checking, and notifications
- API Gateway for routing requests
- MongoDB Atlas for cloud-hosted database

## Features

- Real-time energy consumption dashboard
- Budget management and alerts
- User authentication with OAuth 2.0
- Historical data visualization
- Notification system

## Tech Stack

- **Frontend**: React.js, Chart.js, Material UI
- **Backend**: Node.js, Express.js, MongoDB, AWS Lambda
- **Deployment**: Docker, Kubernetes (AWS EKS), AWS Lambda
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB
- MQTT Broker (Mosquitto)
- Docker & Docker Compose (optional, for containerized deployment)

### Running the Project

#### Option 1: Using Scripts (Recommended for Development)

**Windows:**
```
run-local.bat
```

**Unix/Linux/macOS:**
```
chmod +x run-local.sh
./run-local.sh
```

#### Option 2: Using Docker Compose (Recommended for Production-like Environment)

**Windows:**
```
run-docker.bat
```

**Unix/Linux/macOS:**
```
chmod +x run-docker.sh
./run-docker.sh
```

#### Option 3: Manual Setup

1. Start MongoDB and MQTT Broker
2. Configure environment variables
3. Install dependencies and start services:

```bash
# Install root dependencies
npm install

# Start device service
cd services/device-service
npm install
npm run dev

# In a new terminal, start frontend
cd frontend
npm install
npm run dev
```

### Testing the System

**Windows:**
```
test-device-service.bat
```

**Unix/Linux/macOS:**
```
chmod +x test-device-service.sh
./test-device-service.sh
```

## Detailed Documentation

For more detailed instructions, see:
- [Setup Guide](SETUP.md)
- [Run Project Guide](RUN_PROJECT.md)

## Project Structure

```
/
├── services/
│   └── device-service/       # Handles device data ingestion
├── frontend/                 # React.js frontend application
├── serverless/               # AWS Lambda functions
│   ├── processDeviceData/
│   ├── checkEnergyBudget/
│   └── sendNotifications/
└── kubernetes/               # Kubernetes configuration files
```

