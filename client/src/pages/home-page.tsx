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
  const { readings, alerts, latestReading, updateBudget, markAlertRead } = useEnergyData(user!.id);
  const [newBudget, setNewBudget] = useState("");

  const chartData = readings.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString(),
    consumption: reading.consumption,
  }));

  const totalConsumption = readings.reduce((sum, r) => sum + r.consumption, 0);

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
                {latestReading ? `${latestReading.consumption.toFixed(2)} kWh` : "N/A"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Consumption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {totalConsumption.toFixed(2)} kWh
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
