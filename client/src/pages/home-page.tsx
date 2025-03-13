import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useEnergyData } from "@/lib/use-energy-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { Bell, LogOut, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { readings, alerts, updateBudget, markAlertRead } = useEnergyData();
  const [newBudget, setNewBudget] = useState("");

  const deviceConsumption = readings.reduce((acc, reading) => {
    if (!acc[reading.deviceType]) {
      acc[reading.deviceType] = 0;
    }
    acc[reading.deviceType] += Number(reading.consumption);
    return acc;
  }, {} as Record<string, number>);

  const deviceData = Object.entries(deviceConsumption).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
  }));

  const chartData = readings.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString(),
    value: Number(reading.consumption.toFixed(2)),
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Energy Monitor</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Welcome, {user?.username}</span>
            <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Consumption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device Consumption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Settings</CardTitle>
              <Settings className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Energy Budget (kWh)</label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      type="number"
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                      placeholder={user?.energyBudget?.toString() || "0"}
                    />
                    <Button onClick={() => {
                      if (newBudget) updateBudget(Number(newBudget));
                    }}>
                      Set
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Bell className="h-4 w-4" />
                    Alerts
                  </label>
                  <ScrollArea className="h-[180px]">
                    <div className="space-y-2">
                      {alerts.map((alert) => (
                        <Alert key={alert.id} variant={alert.read ? "default" : "destructive"}>
                          <AlertDescription className="flex items-center justify-between">
                            <span>{alert.message}</span>
                            {!alert.read && (
                              <Badge
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => markAlertRead(alert.id)}
                              >
                                Mark as read
                              </Badge>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
