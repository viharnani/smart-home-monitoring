import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DeviceReading, Alert, DeviceThreshold, Prediction } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function useEnergyData(userId: number) {
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [latestReading, setLatestReading] = useState<DeviceReading | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Only connect WebSocket if we have a valid userId and authenticated user
    if (!userId || !user) {
      console.log("Waiting for user authentication...");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log("Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected, sending auth data");
      // Send authentication data with session
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(c => c.trim().startsWith('connect.sid='));
      const authData = { 
        type: "init", 
        userId,
        sessionId: sessionCookie?.split('=')[1]
      };
      console.log("Sending auth data:", authData);
      ws.send(JSON.stringify(authData));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket received:", data);
        if (data.type === "reading") {
          console.log("New reading received:", data.data);
          setLatestReading(data.data);
          // Invalidate queries to refresh the data
          queryClient.invalidateQueries({ queryKey: [`/api/readings/${userId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/alerts/${userId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/devices/thresholds`] });
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to real-time updates. Retrying...",
        variant: "destructive",
      });
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (ws.readyState === WebSocket.CLOSED) {
          ws.close();
          setSocket(null);
        }
      }, 5000);
    };

    setSocket(ws);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log("Closing WebSocket connection");
        ws.close();
      }
    };
  }, [userId, user, toast]);

  const { data: readings = [] } = useQuery<DeviceReading[]>({
    queryKey: [`/api/readings/${userId}`],
    enabled: !!userId && !!user,
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: [`/api/alerts/${userId}`],
    enabled: !!userId && !!user,
  });

  const { data: thresholds = [] } = useQuery<DeviceThreshold[]>({
    queryKey: [`/api/devices/thresholds`],
    enabled: !!userId && !!user,
  });

  const { data: predictions = [] } = useQuery<Prediction[]>({
    queryKey: [`/api/devices/${latestReading?.deviceId}/predictions`],
    enabled: !!userId && !!user && !!latestReading?.deviceId,
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