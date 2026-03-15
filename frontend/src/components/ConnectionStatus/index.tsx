import { useState, useEffect } from "react";

type Status = "disconnected" | "connecting" | "connected";

type Props = {
  ws: WebSocket | null;
};

export default function ConnectionStatus({ ws }: Props) {
  const [status, setStatus] = useState<Status>("disconnected");

  useEffect(() => {
    if (!ws) {
      setStatus("disconnected");
      return;
    }

    const updateStatus = () => {
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          setStatus("connecting");
          break;
        case WebSocket.OPEN:
          setStatus("connected");
          break;
        case WebSocket.CLOSING:
        case WebSocket.CLOSED:
          setStatus("disconnected");
          break;
      }
    };

    updateStatus();

    ws.addEventListener("open", updateStatus);
    ws.addEventListener("close", updateStatus);

    return () => {
      ws.removeEventListener("open", updateStatus);
      ws.removeEventListener("close", updateStatus);
    };
  }, [ws]);

  const getStatusConfig = () => {
    switch (status) {
      case "disconnected":
        return {
          color: "bg-red-500",
          label: "断开连接",
          pulse: false,
        };
      case "connecting":
        return {
          color: "bg-yellow-500",
          label: "连接中...",
          pulse: true,
        };
      case "connected":
        return {
          color: "bg-green-500",
          label: "已连接",
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900/50 border border-stone-800"
      title={`WebSocket: ${config.label}`}
    >
      <div
        className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? "animate-pulse" : ""}`}
      />
      <span className="text-xs text-stone-400">{config.label}</span>
    </div>
  );
}
