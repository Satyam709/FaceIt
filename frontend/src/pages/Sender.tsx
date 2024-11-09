import { useEffect, useRef, useState } from "react";

function Sender() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "identify-as-sender" }));
      setStatus("WebSocket Connected");
      setIsError(false);
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      try {
        if (message.type === "accept-offer" && message.msg?.sdp) {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription({
              type: "answer",
              sdp: message.msg.sdp,
            });
            setStatus("Connection established");
            setIsError(false);
          }
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
      streamRef.current?.getTracks().forEach((track) => track.stop());
      pcRef.current?.close();
      ws.close();
    };
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1080, height: 560 },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus("Video started");
      setIsError(false);
    } catch (error) {
      console.error("Error starting video:", error);
      setStatus("Failed to access camera/microphone");
      setIsError(true);
    }
  };

  const startShare = async () => {
    if (!wsRef.current || !streamRef.current) {
      setStatus("Video not started");
      setIsError(true);
      return;
    }

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current!);
      });

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

      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        setIsConnected(pc.connectionState === "connected");
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsRef.current.send(
        JSON.stringify({
          type: "create-offer",
          msg: { sdp: offer.sdp },
        })
      );
      console.log("Offer sent");

      setStatus("Offer sent");
      setIsError(false);
    } catch (error) {
      console.error("Error starting share:", error);
      setStatus("Failed to start sharing");
      setIsError(true);
    }
  };

  return (
    <div className="h-screen px-4 py-2">
      <div className="text-4xl font-semibold text-gray-300">Sender</div>
      <div className="flex flex-col mt-8 items-center gap-4">
        <div className="flex gap-4 items-center">
          <p className={!isError ? "text-green-400" : "text-red-500"}>
            {status}
          </p>
          {!isConnected && (
            <button
              className="rounded-sm shadow-md bg-blue-600 px-2 py-1 mr-4 hover:opacity-80 active:opacity-60"
              onClick={startVideo}
            >
              Start the video
            </button>
          )}
          {!isError && (
            <button
              className="rounded-sm shadow-md bg-blue-600 px-2 py-1 hover:opacity-80 active:opacity-60"
              onClick={startShare}
            >
              Start Sharing
            </button>
          )}
        </div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          width={1080}
          height={560}
          className="border-2 border-gray-400 rounded-md"
        />
      </div>
    </div>
  );
}

export default Sender;
