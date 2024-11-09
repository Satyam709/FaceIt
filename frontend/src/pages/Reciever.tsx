import { useEffect, useRef, useState } from "react";

function Receiver() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "identify-as-receiver" }));
      setStatus("WebSocket Connected");
      setIsError(false);
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      try {
        if (message.type === "create-offer" && message.msg?.sdp) {
          await handleOffer(message.msg.sdp);
        } else if (message.type === "ice-candidates" && message.msg?.ice) {
          if (pcRef.current) {
            try {
              await pcRef.current.addIceCandidate(message.msg.ice);
              console.log("Added ICE candidate");
            } catch (err) {
              console.error("Error adding ICE candidate:", err);
            }
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
        setStatus("Connection error");
        setIsError(true);
      }
    };

    ws.onerror = () => {
      setStatus("WebSocket error");
      setIsError(true);
    };

    return () => {
      pcRef.current?.close();
      ws.close();
    };
  }, []);

  const handleOffer = async (sdp: string) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        console.log("Received track:", event);
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE candidate");
          wsRef.current?.send(
            JSON.stringify({
              type: "ice-candidates",
              msg: { ice: event.candidate },
            })
          );
        }
      };

      await pc.setRemoteDescription({
        type: "offer",
        sdp: sdp,
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      wsRef.current?.send(
        JSON.stringify({
          type: "accept-offer",
          msg: { sdp: answer.sdp },
        })
      );
      console.log("Answer sent");

      setStatus("Connected");
      setIsError(false);
    } catch (error) {
      console.error("Error handling offer:", error);
      setStatus("Failed to process offer");
      setIsError(true);
    }
  };

  return (
    <div className="h-screen px-4 py-2">
      <div className="text-4xl font-semibold text-gray-300">Receiver</div>
      <div className="flex flex-col mt-8 items-center gap-4">
        <div className="flex gap-4 items-center">
          <p className={!isError ? "text-green-400" : "text-red-500"}>
            {status}
          </p>
        </div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          width={1080}
          height={560}
          className="border-2 border-gray-400 rounded-md"
        />
      </div>
    </div>
  );
}

export default Receiver;
