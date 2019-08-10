import * as debugLib from "debug";
import { Msg } from "../types";

const debug = debugLib("FileSend:Chat");

class ChatPage {
  private socket: SocketIOClient.Socket | null = null;

  public setSocket = (socket: SocketIOClient.Socket | null): ChatPage => {
    this.socket = socket;
    return this;
  };

  private setMessageForm = (): void => {
    const messageSendingForm = document.getElementById("chatBoxForm") as HTMLFormElement;
    debug("Setting up chat form");
    messageSendingForm.onsubmit = (e): void => {
      e.preventDefault();
      const chatBoxTextBox = messageSendingForm.querySelector('input[type="text"]') as HTMLInputElement;
      const messageValue = chatBoxTextBox.value;
      if (messageValue !== "") {
        if (this.socket === null) {
          debug("socket null, not sending message");
          return;
        }
        
        this.socket.emit("message", messageValue);
        chatBoxTextBox.value = "";
      }
    };
  };

  private getMessageBox = (username: string, messageValue: string, date: Date, senderOrReceiver: string): HTMLDivElement => {
    const div = document.createElement("div");

    const options = {
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    };
    
    const humanReadableDate = Intl.DateTimeFormat('en-IN', options).format(date);

    div.innerHTML = `
                        <main>${messageValue}</main>
                        <aside><time datetime="${date.toString()}">${humanReadableDate}</time></aside>
                      `;
    div.className = "chat-message " + senderOrReceiver;
    return div;
  };

  private addNewMessage = (msg: Msg, senderOrReceiver: string): void => {
    const chatBox: Element | null = document.getElementById("chatBox");
    if (chatBox !== null) {
      if (chatBox !== null) {
        const button = this.getMessageBox(msg.username, msg.messageValue, msg.date, senderOrReceiver);
        chatBox.append(button);
        button.scrollIntoView(false);
      }
    }
  };

  private onMessageSentSuccess = (msg: Msg): void => {
    // message is sent successfully to user2 and now will be shown in user1 chatbox
    msg.date = new Date(msg.date);
    this.addNewMessage(msg, "sender");
  };

  private onMessageIncoming = (msg: Msg): void => {
    // message is received successfully by user2 and now will be shown in user2 chatbox
    msg.date = new Date(msg.date);
    this.addNewMessage(msg, "receiver");
  };

  public setup = (): void => {
    if (this.socket === null) {
      debug("Socket null. Can't set up");
      return;
    }

    this.setMessageForm();
    this.socket.on("messageSentSuccess", this.onMessageSentSuccess);
    this.socket.on("messageIncoming", this.onMessageIncoming);
  };
}

export default new ChatPage();