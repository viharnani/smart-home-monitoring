interface DeviceData {
  deviceId: string;
  timestamp: Date;
  consumption: number;
  voltage?: number;
  current?: number;
}

export class DeviceDataProcessor {
  async process(data: DeviceData): Promise<DeviceData> {
    // Add data validation and enrichment logic here
    // For example, calculate power factor, add device metadata, etc.
    return {
      ...data,
      processedAt: new Date()
    };
  }
}
