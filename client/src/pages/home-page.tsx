import { useAuth } from "@/hooks/use-auth";
import { useEnergyData } from "@/hooks/use-energy-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { LogOut, Bell, Settings, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { readings, alerts, latestReading, predictions, thresholds, updateBudget, setDeviceThreshold, markAlertRead } = useEnergyData(user!.id);
  const [newBudget, setNewBudget] = useState("");
  const [newThreshold, setNewThreshold] = useState({
    deviceId: "",
    dailyThreshold: 0,
    weeklyThreshold: 0,
    monthlyThreshold: 0
  });

  const chartData = readings.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString(),
    consumption: reading.consumption,
    predicted: predictions.find(p => p.deviceId === reading.deviceId)?.predictedConsumption || null
  }));

  const totalConsumption = readings.length > 0 
    ? readings.reduce((sum, r) => sum + r.consumption, 0).toFixed(2)
    : "0.00";

  const currentConsumption = latestReading 
    ? `${latestReading.consumption.toFixed(2)} kWh`
    : "Connecting...";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Energy Monitor</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Current Consumption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {currentConsumption}
              </div>
              {!latestReading && (
                <p className="text-sm text-muted-foreground mt-2">
                  Establishing real-time connection...
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Consumption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {totalConsumption} kWh
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Energy Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  placeholder="Set budget (kWh)"
                />
                <Button
                  onClick={() => {
                    const budget = parseFloat(newBudget);
                    if (!isNaN(budget) && budget > 0) {
                      updateBudget(budget);
                      setNewBudget("");
                    }
                  }}
                >
                  Set
                </Button>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Current budget: {user?.energyBudget || 0} kWh
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Predictions and Recommendations */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Energy Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            {latestPrediction ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Predicted Consumption</p>
                    <p className="text-2xl font-bold">{latestPrediction.predictedConsumption.toFixed(2)} kWh</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="text-2xl font-bold">{(latestPrediction.confidence * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-2">Recommendations:</p>
                  <ul className="space-y-2">
                    {latestPrediction.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">{rec.type}</p>
                          <p className="text-sm text-muted-foreground">{rec.message}</p>
                          <p className="text-sm text-primary">Potential Savings: {rec.potentialSavings.toFixed(2)} kWh</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No predictions available yet</p>
            )}
          </CardContent>
        </Card>

        {/* Device Thresholds */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Device Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Device ID</label>
                  <Input
                    value={newThreshold.deviceId}
                    onChange={(e) => setNewThreshold(prev => ({ ...prev, deviceId: e.target.value }))}
                    placeholder="Enter device ID"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium">Daily Threshold (kWh)</label>
                    <Input
                      type="number"
                      value={newThreshold.dailyThreshold}
                      onChange={(e) => setNewThreshold(prev => ({ ...prev, dailyThreshold: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Weekly Threshold (kWh)</label>
                    <Input
                      type="number"
                      value={newThreshold.weeklyThreshold}
                      onChange={(e) => setNewThreshold(prev => ({ ...prev, weeklyThreshold: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Monthly Threshold (kWh)</label>
                    <Input
                      type="number"
                      value={newThreshold.monthlyThreshold}
                      onChange={(e) => setNewThreshold(prev => ({ ...prev, monthlyThreshold: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (newThreshold.deviceId && newThreshold.dailyThreshold > 0) {
                      setDeviceThreshold(newThreshold);
                      setNewThreshold({
                        deviceId: "",
                        dailyThreshold: 0,
                        weeklyThreshold: 0,
                        monthlyThreshold: 0
                      });
                    }
                  }}
                >
                  Set Thresholds
                </Button>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Current Thresholds</h3>
                <div className="space-y-2">
                  {thresholds.map((threshold) => (
                    <div key={threshold.id} className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium">Device: {threshold.deviceId}</p>
                      <div className="mt-1 grid gap-2 sm:grid-cols-3">
                        <p className="text-sm">Daily: {threshold.dailyThreshold} kWh</p>
                        <p className="text-sm">Weekly: {threshold.weeklyThreshold || 'N/A'} kWh</p>
                        <p className="text-sm">Monthly: {threshold.monthlyThreshold || 'N/A'} kWh</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Consumption History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="consumption"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  {predictions.length > 0 && (
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="hsl(var(--primary)/0.5)"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-bold">Alerts</h2>
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.isRead ? "default" : "destructive"}
              className="cursor-pointer"
              onClick={() => !alert.isRead && markAlertRead(alert.id)}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Energy Alert</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      </main>
    </div>
  );
}