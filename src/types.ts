export interface User {
  socketID: string;
  state: "idle" | "waiting" | "connected";
  outRequest: string;
  partner: string;
  inRequests: Set<string>;
  filesSendingState: "idle" | "waiting" | "sending" | "receiving";
}

export interface ExtendedSocket extends SocketIO.Socket {
  username: string;
}

export class Msg {
  public username: string;
  public messageValue: string;
  public date: Date;
  public constructor(username: string, messageValue: string) {
    this.username = username;
    this.messageValue = messageValue;
    this.date = new Date();
  }
}