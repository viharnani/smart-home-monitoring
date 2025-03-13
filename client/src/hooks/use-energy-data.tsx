import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DeviceReading, Alert } from "@shared/schema";
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
    updateBudget: updateBudgetMutation.mutate,
    markAlertRead: markAlertReadMutation.mutate,
  };
}
