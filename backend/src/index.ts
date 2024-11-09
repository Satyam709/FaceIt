import WebSocket from "ws";
import { WebSocketServer } from "ws";

const port = 8080;

const wss = new WebSocketServer({ port }, () =>
  console.log("WebSocket server established on " + port)
);

let receiver: WebSocket | null = null;
let sender: WebSocket | null = null;

enum MessageType {
  IDENTIFY_AS_RECEIVER = "identify-as-receiver",
  IDENTIFY_AS_SENDER = "identify-as-sender",
  ICE_CANDIDATES = "ice-candidates",
  CREATE_OFFER = "create-offer",
  ACCEPT_OFFER = "accept-offer",
}

interface Message {
  type: string;
  msg: any;
}

wss.on("connection", (ws) => {
  ws.on("error", console.error);

  ws.on("message", (data) => {
    try {
      const message: Message = JSON.parse(data.toString());
      console.log("Received:", message);

      switch (message.type) {
        case MessageType.IDENTIFY_AS_SENDER:
          sender = ws;
          console.log("Sender identified");
          break;

        case MessageType.IDENTIFY_AS_RECEIVER:
          receiver = ws;
          console.log("Receiver identified");
          break;

        case MessageType.CREATE_OFFER:
          if (ws === sender && receiver && message.msg?.sdp) {
            receiver.send(
              JSON.stringify({
                type: "create-offer",
                msg: { sdp: message.msg.sdp },
              })
            );
            console.log("Offer forwarded to receiver");
          }
          break;

        case MessageType.ACCEPT_OFFER:
          if (ws === receiver && sender && message.msg?.sdp) {
            sender.send(
              JSON.stringify({
                type: "accept-offer",
                msg: { sdp: message.msg.sdp },
              })
            );
            console.log("Answer forwarded to sender");
          }
          break;

        case MessageType.ICE_CANDIDATES:
          if (ws === sender && receiver) {
            receiver.send(
              JSON.stringify({
                type: "ice-candidates",
                msg: { ice: message.msg.ice },
              })
            );
          } else if (ws === receiver && sender) {
            sender.send(
              JSON.stringify({
                type: "ice-candidates",
                msg: { ice: message.msg.ice },
              })
            );
          }
          console.log("ICE candidate forwarded");
          break;
      }
    } catch (error) {
      console.error("Invalid message received:", error);
    }
  });

  ws.on("close", () => {
    if (ws === sender) {
      sender = null;
      console.log("Sender disconnected");
    } else if (ws === receiver) {
      receiver = null;
      console.log("Receiver disconnected");
    }
  });
});
