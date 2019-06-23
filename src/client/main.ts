import Client from "./wt";
import { stat } from "fs";
import { IExtendedSocket, IUser, Msg } from "../types";

const usernameTextBox: HTMLInputElement = document.getElementById("username") as HTMLInputElement;
const connectToSocket = () => {
    const username = usernameTextBox.value;
    if (username !== "") {
        const socket: SocketIOClient.Socket = io(window.location.origin, {query: `username=${username}`});
        setSocketConnections(socket);
    } else {
        window.confirm("Please Enter some username");
    }
};
const startSendingButton: HTMLElement | null = document.getElementById("startSendingButton");
if (startSendingButton !== null) {
    startSendingButton.addEventListener("click", connectToSocket);
}

const setSocketConnections = (socket: SocketIOClient.Socket) => {
    socket.on("login", (usersArray: Array<[string, IUser]>) => {
        const users: Map<string, IUser> = new Map(usersArray);
        if (users) {
            // hiding page 1
            const loginPage: HTMLElement | null = document.getElementById("loginPage");
            const dashboardPage: HTMLElement | null = document.getElementById("dashboardPage");
            if (loginPage !== null && dashboardPage !== null) {
                loginPage.style.display = "none";
                const onlineUsersList: Element | null = document.getElementById("onlineUsersList");
                users.forEach((value: IUser, key: string) => {
                    if (onlineUsersList !== null) {
                        const li = document.createElement("li");
                        li.className = "list-group-item d-flex justify-content-between"
                                        + "align-items-center list-group-item-action";
                        li.innerText = key;
                        onlineUsersList.append(li);
                    }
                });
                dashboardPage.style.display = "block";
            }
        }
    });

    socket.on("newUserLogin", (user: {username: string, val: IUser}) => {
        if (user) {
          const onlineUsersList: Element | null = document.getElementById("onlineUsersList");
          if (onlineUsersList !== null) {
            const li = document.createElement("li");
            li.className =
              "list-group-item d-flex justify-content-between" +
              "align-items-center list-group-item-action";
            li.innerText = user.username;
            onlineUsersList.append(li);
          }
        }
    });

    socket.on("userDisconnected", (username: string) => {
        if (username) {
          const onlineUsersList: Element | null = document.getElementById("onlineUsersList");
          if (onlineUsersList !== null) {
            let i = 0;
            const allListElements: HTMLCollection = onlineUsersList.children;
            for (i = 0; i < allListElements.length; i++) {
                const listElement = allListElements[i] as HTMLElement;
                if (listElement !== undefined) {
                    if (listElement.innerText.split("\n")[0] === username) {
                        break;
                    }
                }
            }
            // removing the disconnected user
            onlineUsersList.removeChild(allListElements[i]);
          }
        }
    });
};
/*
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
*/