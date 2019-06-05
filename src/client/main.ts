import Client from "./wt";

$(() => {
    const socket = io();
    socket.on("bye-bye", () => {
        $("body").text("Server sent bye-bye");
    });

    socket.on("connected", () => {
        $("body").append("<br>Connected to another user!");

        const client = new Client(socket);

        $("button").click( () => {
            const fileInput: HTMLInputElement = document.getElementById("file_submit") as HTMLInputElement;
            const files = fileInput.files;

            if (files === null) {
                window.alert("Select some files");
                return;
            }

            client.sendFile(files[0]);
        });
    });

    socket.on("disconnected", () => {
        $("body").text("The other user has disconnected!");
    });
});
