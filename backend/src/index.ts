import WebSocket, { errorMonitor } from "ws";
import { WebSocketServer } from "ws";

const port = 8080;

const wss = new WebSocketServer({ port: port }, () =>
  console.log("web socket server estabilised on " + port)
);

var reciever: WebSocket | null = null;
var sender: WebSocket | null = null;

enum operation {
  "identify-as-reciever" = "identify-as-reciever",
  "identify-as-sender" = "identify-as-sender",
  "ice-candidates" = "ice-candidates",
  "create-offer" = "create-offer",
  "accept-offer" = "accept-offer",
}

interface ClientInfo {
  type: operation;
  msg?: any;
}

wss.on("connection", (ws) => {
  ws.on("error", (error) => {
    console.log("error connecting to client\n" + error);
  });
  ws.on("message", (data) => {
    try {
      const parsedData: ClientInfo = JSON.parse(data.toString());
      //console.log("type = " + parsedData.type);
      console.log("\n");
      if (parsedData.type == operation["identify-as-sender"]) {
        sender = ws;
        console.log("sender set");
      } else if (parsedData.type == operation["identify-as-reciever"]) {
        reciever = ws;
        console.log("reciever set");
      } else if (
        parsedData.type == operation["create-offer"] &&
        ws === sender
      ) {
        console.log("found senders offer");

        if (parsedData.msg?.sdp)
          reciever?.send(
            JSON.stringify({
              type: parsedData.type,
              msg: { sdp: parsedData.msg?.sdp },
            })
          );
        else console.log("no sdp found");
      } else if (
        parsedData.type == operation["accept-offer"] &&
        ws === reciever
      ) {
        if (parsedData.msg?.sdp) {
          sender?.send(
            JSON.stringify({
              type: parsedData.type,
              msg: { sdp: parsedData.msg?.sdp },
            })
          );
          console.log("answer sent to sender!");
        } else console.log("no sdp found");
      } else if (parsedData.type == operation["ice-candidates"]) {
        if (ws == sender) {
          reciever?.send(
            JSON.stringify({
              type: parsedData.type,
              msg: parsedData.msg?.ice,
            })
          );
        } else if (ws == reciever) {
          sender?.send(
            JSON.stringify({
              type: parsedData.type,
              msg: parsedData.msg?.ice,
            })
          );
        }
      }

      console.log("recieved : " + JSON.stringify(parsedData));
    } catch (error) {
      console.log("invalid data recieved \n\n" + error);
    }
  });
});
