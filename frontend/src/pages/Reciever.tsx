import { useEffect, useRef, useState } from "react";

function Reciever() {
  const videoSrc = useRef("");
  const [gotError, setGotError] = useState("");
  const [isErr, setIsErr] = useState(false);
  const rtc = useRef<RTCPeerConnection>();
  const ws = useRef<WebSocket>();
  const rtcSessionDesc = useRef<RTCSessionDescriptionInit>();

  useEffect(() => {
    const socket = (ws.current = new WebSocket("ws://localhost:8080"));
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "identify-as-reciever" }));
      setGotError("Connection Estabilished");
      setIsErr(false);
    };

    socket.onerror = (error) => {
      setGotError("Something went wrong!");
      console.log("failed");
      setIsErr(true);
      console.log(error);
    };

    socket.onmessage = async (ev) => {
      const info = JSON.parse(ev.data);
      console.log(info);
      if (info.type === "create-offer") {
        const pc = (rtc.current = new RTCPeerConnection());
        pc.onicegatheringstatechange = () => console.log(pc.iceGatheringState);

        const answer = await pc.createOffer();
        rtcSessionDesc.current = answer;
        pc.onicecandidate = (event) => {
          ws.current?.send(
            JSON.stringify({
              type: "ice-candidate",
              msg: { ice: event.candidate },
            })
          );
        };
        await pc.setLocalDescription(answer);
        if (info.msg.sdp) {
          console.log("parsed offer is : " + JSON.stringify(info.msg));

          await pc.setRemoteDescription({ sdp: info.msg.sdp, type: "offer" });
        }
      } else if (info.type == "ice-candidates") {
        console.log("ice candidates recieved");
        rtc.current?.addIceCandidate(info.msg.ice);
        console.log("added!");
      }
    };
  }, []);

  const startRecieving = async () => {
    ws.current?.send(
      JSON.stringify({
        type: "accept-offer",
        msg: { sdp: rtcSessionDesc.current?.sdp },
      })
    );
    console.log("answer data send");
  };

  return (
    <div className="h-screen px-4 py-2">
      <div className="text-4xl font-semibold text-gray-300">Reciever</div>
      <div className="flex flex-col mt-8 items-center gap-4">
        <div className="flex gap-4 items-center">
          <p className={!isErr ? "text-green-400 " : "text-red-500"}>
            {gotError}
          </p>
          {!isErr && (
            <button
              className="rounded-sm shadow-md bg-blue-600 px-2 py-1 hover:opacity-80 active:opacity-60"
              onClick={startRecieving}
            >
              Start Recieving
            </button>
          )}
        </div>
        <video
          src={videoSrc.current}
          width={1280}
          height={720}
          className="border-2 border-gray-400 rounded-md"
        ></video>
      </div>
    </div>
  );
}

export default Reciever;
