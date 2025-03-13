import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DeviceReading, Alert } from "@shared/schema";
import { apiRequest, queryClient } from "./queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export function useEnergyData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [readings, setReadings] = useState<DeviceReading[]>([]);

  const { data: initialReadings } = useQuery<DeviceReading[]>({
    queryKey: ["/api/energy/readings"],
    enabled: !!user,
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/energy/alerts"],
    enabled: !!user,
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (budget: number) => {
      const res = await apiRequest("POST", "/api/energy/budget", { energyBudget: budget });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Budget Updated",
        description: "Your energy budget has been updated successfully.",
      });
    },
  });

  const markAlertReadMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await apiRequest("POST", `/api/energy/alerts/${alertId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/energy/alerts"] });
    },
  });

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", userId: user.id }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "reading") {
        setReadings(prev => [...prev.slice(-29), message.data]);
      } else if (message.type === "alert") {
        queryClient.invalidateQueries({ queryKey: ["/api/energy/alerts"] });
        toast({
          title: "Energy Alert",
          description: message.data.message,
          variant: "destructive",
        });
      }
    };

    setSocket(ws);
    return () => {
      ws.close();
    };
  }, [user]);

  useEffect(() => {
    if (initialReadings) {
      setReadings(initialReadings);
    }
  }, [initialReadings]);

  return {
    readings,
    alerts: alerts || [],
    updateBudget: updateBudgetMutation.mutate,
    markAlertRead: markAlertReadMutation.mutate,
    isLoading: updateBudgetMutation.isPending,
  };
}
