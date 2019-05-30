export interface User {
    socketID: string,
    state: string,
    outRequest: string,
    partner: string,
    fileSendingState: string,  //idle, file_request, sending, receiving
    inRequests: Set<string>
}

export interface ExtendedSocket extends SocketIO.Socket{
    username: string;
}