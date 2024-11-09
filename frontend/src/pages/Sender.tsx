import { useEffect, useRef, useState } from "react";

function Sender() {
  const videoSrc = useRef<HTMLVideoElement | null>(null);
  const [gotError, setGotError] = useState<string>("");
  const [isErr, setIsErr] = useState<boolean>(false);
  const ws = useRef<WebSocket | null>(null); // Properly type WebSocket reference
  const pcRef = useRef<RTCPeerConnection | null>(null); // Make sure pcRef is correctly typed

  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const socket = (ws.current = new WebSocket("ws://localhost:8080"));

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "identify-as-sender" }));
      setGotError("Connection Established");
      setIsErr(false);
    };

    socket.onmessage = async (ev) => {
      const data = JSON.parse(ev.data);
      console.log(data);

      if (data.type === "accept-offer") {
        console.log("accept-offer triggered");

        if (pcRef.current && data.msg.sdp) {
          await pcRef.current.setRemoteDescription({
            sdp: data.msg.sdp,
            type: "answer",
          });
          console.log("Remote description set to answer");
          setGotError("Set the remote description to answer");
          setIsErr(false);
        } else {
          console.log("pcRef is null or missing SDP");
          setGotError("Cannot set remote description");
          setIsErr(true);
        }
      } else if (data.type === "ice-candidates") {
        console.log("ICE candidates received");

        if (pcRef.current) {
          pcRef.current
            .addIceCandidate(data.msg.ice)
            .then(() => console.log("Added ICE candidate"))
            .catch((err) => console.log("Error adding ICE candidate", err));
        }
      }
    };

    socket.onerror = (error) => {
      setGotError("Something went wrong with WebSocket!");
      console.error("WebSocket error:", error);
      setIsErr(true);
    };

    // Clean up WebSocket connection when component unmounts
    return () => {
      socket.close();
    };
  }, []);

  const startVideo = async () => {
    const media = navigator.mediaDevices;
    try {
      const stream = await media.getUserMedia({
        video: { width: { exact: 1080 }, height: { exact: 560 } },
        audio: true,
      });
      if (videoSrc.current) {
        videoSrc.current.autoplay = true;
        videoSrc.current.srcObject = stream;
      } else {
        throw new Error("Can't access video");
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setGotError("Error accessing media devices");
      setIsErr(true);
    }
  };

  const startShare = async () => {
    if (!ws.current || !videoSrc.current) {
      setGotError("WebSocket or video element not ready");
      setIsErr(true);
      return;
    }

    const pc = (pcRef.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    }));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.current?.send(
          JSON.stringify({
            type: "ice-candidates",
            msg: { ice: event.candidate },
          })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        console.log("Peer connection established");
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    };

    // Get the local stream and add tracks to the connection
    const stream = videoSrc.current.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => pc.addTrack(track, stream));

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      ws.current?.send(
        JSON.stringify({ type: "create-offer", msg: { sdp: offer.sdp } })
      );
    } catch (error) {
      console.error(
        "Error during offer creation or setting local description:",
        error
      );
      setGotError("Error creating or setting offer");
      setIsErr(true);
    }
  };

  return (
    <div className="h-screen px-4 py-2">
      <div className="text-4xl font-semibold text-gray-300">Sender</div>
      <div className="flex flex-col mt-8 items-center gap-4">
        <div className="flex gap-4 items-center">
          <p className={!isErr ? "text-green-400" : "text-red-500"}>
            {gotError}
          </p>
          {!isConnected && (
            <button
              className="rounded-sm shadow-md bg-blue-600 px-2 py-1 mr-4 hover:opacity-80 active:opacity-60"
              onClick={startVideo}
            >
              Start the video
            </button>
          )}
          {!isErr && (
            <button
              className="rounded-sm shadow-md bg-blue-600 px-2 py-1 hover:opacity-80 active:opacity-60"
              onClick={startShare}
            >
              Start Sharing
            </button>
          )}
        </div>
        <video
          ref={videoSrc}
          width={1080}
          height={560}
          className="border-2 border-gray-400 rounded-md"
        ></video>
      </div>
    </div>
  );
}

export default Sender;
