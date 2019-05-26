$(() => {
    const socket = io();
    socket.on('bye-bye', () => {
        $('body').text('Server sent bye-bye');
    });

    socket.on('connected', () => {
        $('body').text('Connected to another user!');
    });

    socket.on('disconnected', () => {
        $('body').text('The other user has disconnected!');
    });
});