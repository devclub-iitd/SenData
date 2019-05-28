import wt = require('./wt')

$(() => {
    const socket = io();
    socket.on('bye-bye', () => {
        $('body').text('Server sent bye-bye');
    });

    const STUN_URL = `stun:${process.env.STUN_IP}:3478`;
    const TRACKER_URL = `ws://${process.env.TRACKER_IP}:8000`;
    let rtcConfig = {
        'urls': STUN_URL
    }

    socket.on('connected', () => {
        $('body').append('<br>Connected to another user!');

        let client = new wt.Client(socket);

        $('button').click( () => {
            let file_input: HTMLInputElement = document.getElementById('file_submit') as HTMLInputElement
            let files = file_input.files;

            if(files === null) {
                window.alert("Select some files");
                return;
            }
    
            client.sendFile(files)
        })
    })

    socket.on('disconnected', () => {
        $('body').append('The other user has disconnected!');
    })
});