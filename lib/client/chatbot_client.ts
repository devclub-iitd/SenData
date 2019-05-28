let socket = io();

class Msg {
    public messageValue: string;
    public timeStamp: string;
    constructor(messageValue: string) {
        this.messageValue = messageValue;
        const currentdate = new Date();
        this.timeStamp = currentdate.getHours() + ":"
            + currentdate.getMinutes() + ":"
            + currentdate.getSeconds();
    }
}

const sendMessage = (messageValue: string) => {
    socket.emit('message', messageValue);
};

// importing DOM elements for chatbox
const chats: HTMLElement | null = document.getElementById('chats');
const message: HTMLElement | null = document.getElementById('btn-input');
const sendButton: HTMLElement | null = document.getElementById('btn-chat');
const typing: HTMLElement | null = document.getElementById('typing');

socket.on('message', (msg: Msg) => {
    // old chats.innerHTML += `<li class='left clearfix'><span class='chat-img pull-left'><img src='/images/U.png' alt='User Avatar' class='img-circle' /></span><div class='chat-body clearfix'><div class='header'><small class=' text-muted' id = '${message.timeStamp}'><span class='glyphicon glyphicon-time'></span><span class = 'time'>0</span><span class= 'timeunit'> mins</sapn> ago</small><strong class='pull-left primary-font'>${msg.username}</strong></div><p class='chat_text_message'>${msg.messageValue}</p></div></li>`;
    if(chats) {
        const li = document.createElement('li');
        li.className = 'left clearfix';
        li.innerHTML = `<span class='chat-img pull-left'><img src='/images/U.png' alt='User Avatar' class='img-circle' /></span><div class='chat-body clearfix'><div class='header'><small class=' text-muted' id = '${message.timeStamp}'><span class='glyphicon glyphicon-time'></span><span class = 'time'>0</span><span class= 'timeunit'> mins</sapn> ago</small><strong class='pull-left primary-font'>${msg.username}</strong></div><p class='chat_text_message'>${msg.messageValue}</p></div>`;
        chats.appendChild(li);
    }
});
