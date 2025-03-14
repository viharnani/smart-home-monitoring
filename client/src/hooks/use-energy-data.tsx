import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DeviceReading, Alert, DeviceThreshold, Prediction } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useEnergyData(userId: number) {
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [latestReading, setLatestReading] = useState<DeviceReading | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "init", userId }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "reading") {
        setLatestReading(data.data);
        queryClient.invalidateQueries({ queryKey: [`/api/readings/${userId}`] });
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [userId]);

  const { data: readings = [] } = useQuery<DeviceReading[]>({
    queryKey: [`/api/readings/${userId}`],
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: [`/api/alerts/${userId}`],
  });

  const { data: thresholds = [] } = useQuery<DeviceThreshold[]>({
    queryKey: [`/api/devices/thresholds`],
  });

  const { data: predictions = [] } = useQuery<Prediction[]>({
    queryKey: [`/api/devices/${latestReading?.deviceId}/predictions`],
    enabled: !!latestReading?.deviceId,
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (budget: number) => {
      await apiRequest("POST", `/api/users/${userId}/budget`, { budget });
    },
    onSuccess: () => {
      toast({
        title: "Budget updated",
        description: "Your energy budget has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setDeviceThresholdMutation = useMutation({
    mutationFn: async ({ deviceId, ...thresholdData }: Omit<DeviceThreshold, "id" | "userId" | "createdAt">) => {
      await apiRequest("POST", `/api/devices/${deviceId}/thresholds`, thresholdData);
    },
    onSuccess: () => {
      toast({
        title: "Threshold updated",
        description: "Device threshold has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/devices/thresholds`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update threshold",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAlertReadMutation = useMutation({
    mutationFn: async (alertId: number) => {
      await apiRequest("POST", `/api/alerts/${alertId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/alerts/${userId}`] });
    },
  });

  return {
    readings,
    latestReading,
    alerts,
    thresholds,
    predictions,
    updateBudget: updateBudgetMutation.mutate,
    setDeviceThreshold: setDeviceThresholdMutation.mutate,
    markAlertRead: markAlertReadMutation.mutate,
  };
}