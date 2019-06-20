export interface IUser {
  socketID: string;
  state: string;
  outRequest: string;
  partner: string;
  inRequests: Set<string>;
  filesSendingState: string;  // idle || waiting || sending || receiving
}

export interface IExtendedSocket extends SocketIO.Socket {
  username: string;
}

export class Msg {
  public username: string;
  public messageValue: string;
  public timeStamp: string;
  constructor(username: string, messageValue: string) {
    this.username = username;
    this.messageValue = messageValue;
    const currentDate = new Date();
    this.timeStamp = currentDate.getHours() + ":"
                        + currentDate.getMinutes() + ":"
                        + currentDate.getSeconds();
  }
}
