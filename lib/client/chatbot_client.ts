import { ExtendedSocket, FileRequest, Msg, User } from "../types";

const socket = io();

// Importing chatbox DOM elements from HTML file
const chats: HTMLElement | null = document.getElementById('chats');
const message: HTMLInputElement | null = document.getElementById('btn-input') as HTMLInputElement;
const sendButton: HTMLElement | null = document.getElementById('btn-chat');
const typing: HTMLElement | null = document.getElementById('typing');

const sendMessage = (messageValue: string) => {
    if (messageValue !== '') {
        socket.emit('message', messageValue);
    }
};

socket.on('message', (msg: Msg) => {
    if (chats !== null) {
        // chats will be null in case it is not properly loaded in the ts file
        const li = document.createElement('li');
        li.className = 'left clearfix';
        li.innerHTML = `<span class='chat-img pull-left'><img src='/images/U.png' alt='User Avatar' class='img-circle' /></span><div class='chat-body clearfix'><div class='header'><small class=' text-muted' id = '${msg.timeStamp}'><span class='glyphicon glyphicon-time'></span><span class = 'time'>0</span><span class= 'timeunit'> mins</sapn> ago</small><strong class='pull-left primary-font'>${msg.username}</strong></div><p class='chat_text_message'>${msg.messageValue}</p></div>`;
        chats.appendChild(li);
    }
});

socket.on('file_send_request', (filerequest: FileRequest) => {
});

// setting click listener to sendButton
if (sendButton !== null) {
    sendButton.addEventListener('click', () => {
        if (message !== null && message.value !== '') {
            sendMessage(message.value);
        }
    });
}
