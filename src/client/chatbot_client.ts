import { IExtendedSocket, /* FileRequest ,*/ IUser, Msg } from "../types";

const socket = io();

// Importing chatBox DOM elements from HTML file
const chats: HTMLElement | null = document.getElementById("chats");
const message: HTMLInputElement | null = document.getElementById("btn-input") as HTMLInputElement;
const sendButton: HTMLElement | null = document.getElementById("btn-chat");
const typing: HTMLElement | null = document.getElementById("typing");

const sendMessage = (messageValue: string): void => {
  if (messageValue !== "") {
    socket.emit("message", messageValue);
  }
};

socket.on("message", (msg: Msg): void => {
  if (chats !== null) {
    // chats will be null in case it is not properly loaded in the ts file
    const li = document.createElement("li");
    li.className = "left clearfix";
    li.innerHTML =
            `<span class='chat-img pull-left'>
                <img src='/images/U.png' alt='User Avatar' class='img-circle' />
            </span>
            <div class='chat-body clearfix'>
                <div class='header'>
                    <small class=' text-muted' id = '${msg.timeStamp}'>
                        <span class='glyphicon glyphicon-time'></span>
                        <span class = 'time'>0</span><span class= 'timeunit'> mins</span>
                        ago
                    </small>
                    <strong class='pull-left primary-font'>${msg.username}</strong>
                </div>
            <p class='chat_text_message'>${msg.messageValue}</p></div>`;
    chats.appendChild(li);
  }
});

socket.on("fileSendRequest", (fileRequest: FileList): void => {
  // Displat fileRequest to user and ask for yes or no
  // Setting click listener to sendButton
  // Use HTML DOM to get the answer
  const answer = true;
  if (typeof(answer) === "boolean") {
    socket.emit("fileRequestAnswer", answer);
  }
});

// setting click listener to sendButton
if (sendButton !== null) {
  sendButton.addEventListener("click", (): void => {
    if (message !== null && message.value !== "") {
      sendMessage(message.value);
    }
  });
}
