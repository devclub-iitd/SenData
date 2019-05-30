export interface User {
    socketID: string;
    state: string;
    outRequest: string;
    partner: string;
    inRequests: Set<string>;
    fileSendingState: string;  // idle || waiting || sending || receiving
}

export interface ExtendedSocket extends SocketIO.Socket {
    username: string;
}

export class Msg {
    public username: string;
    public messageValue: string;
    public timeStamp: string;
    constructor(username: string, messageValue: string) {
        this.username = username;
        this.messageValue = messageValue;
        const currentdate = new Date();
        this.timeStamp = currentdate.getHours() + ':'
                        + currentdate.getMinutes() + ':'
                        + currentdate.getSeconds();
    }
}

export interface FileRequest {
    filename: string;
    filesize: string;
}
