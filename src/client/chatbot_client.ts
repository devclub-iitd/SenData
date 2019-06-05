import { IExtendedSocket, /* FileRequest ,*/ IUser, Msg } from "../types";

const socket = io();

// Importing chatBox DOM elements from HTML file
const chats: HTMLElement | null = document.getElementById("chats");
const message: HTMLInputElement | null = document.getElementById("btn-input") as HTMLInputElement;
const sendButton: HTMLElement | null = document.getElementById("btn-chat");
const typing: HTMLElement | null = document.getElementById("typing");

const sendMessage = (messageValue: string) => {
    if (messageValue !== "") {
        socket.emit("message", messageValue);
    }
};

socket.on("message", (msg: Msg) => {
    if (chats !== null) {
        // chats will be null in case it is not properly loaded in the ts file
        const li = document.createElement("li");
        li.className = "left clearfix";
        li.innerHTML =
            `<span class='chat-img pull-left'>
                <img src='/images/U.png' alt='User Avatar' class='img-circle' /><
            /span>
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

// NOTE: Commented this out as fileRequest isn't defined --Arpit
socket.on("fileSendRequest", (/* fileRequest: FileRequest */) => {
    // Setting click listener to sendButton
    // Use HTML DOM to get the answer
    const answer: boolean = true;
    if (typeof(answer) === "boolean") {
        socket.emit("fileRequestAnswer", answer);
    }
});

// setting click listener to sendButton
if (sendButton !== null) {
    sendButton.addEventListener("click", () => {
        if (message !== null && message.value !== "") {
            sendMessage(message.value);
        }
    });
}
