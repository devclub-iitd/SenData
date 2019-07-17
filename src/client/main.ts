import * as debugLib from "debug";
import modalHandler from "./modal";
import { IExtendedSocket, IUser, Msg } from "../types";
import Client from "./wt";
import { formatBytes, showChild } from "./util";

const debug = debugLib("FileSend:Main");

/* globals io */

let socket: SocketIOClient.Socket | undefined; // The socket this client uses to connect

const setSocketConnections = (): void => {
  // if send offer to a user
  // socket.emit('offer', user2name);

  // If socket is undefined, do nothing
  if (socket === undefined) {
    return;
  }

  const getMessageBox = (username: string, messageValue: string, timeStamp: string, senderOrReceiver: string): HTMLDivElement => {
    const div = document.createElement("div");
    div.innerHTML = `
                        <main><strong>${username}: </strong>${messageValue}</main>
                        <aside><time datetime="${timeStamp}">${timeStamp}</time></aside>
                      `;
    div.className = "chat-message " + senderOrReceiver;
    return div;
  }

  const addNewMessage = (msg: Msg, senderOrReceiver: string): void => {
    const chatBox: Element | null = document.getElementById("chatBox");
    if (chatBox !== null) {
      if (chatBox !== null) {
        const button = getMessageBox(msg.username, msg.messageValue, msg.timeStamp, senderOrReceiver);
        chatBox.append(button);
      }
    }
  }

  const connectToUser = (element: HTMLElement): void => {
    // If socket is undefined, do nothing
    if (socket === undefined) {
      return;
    }

    const setMessageForm = (): void => {
      const messageSendingForm = document.getElementById("chatBoxForm") as HTMLFormElement;
      messageSendingForm.onsubmit = (e): void => {
        e.preventDefault();
        const chatBoxTextBox = messageSendingForm.querySelector('input[type="text"]') as HTMLInputElement;
        const messageValue = chatBoxTextBox.value;
        if (messageValue !== "") {
          socket.emit("message", messageValue);
        }
      }
    }

    let dataUserType = element.getAttribute("data-user-type");
    if (dataUserType == "idle") {
      const user2Name = element.innerText;
      modalHandler.setUser2Name(user2Name);
      modalHandler.show("initiate-connection");
      // Show send request alert

      modalHandler.once("connect", (): void => {
        if (socket) {
          socket.emit('offer', user2Name);
          socket.on("answer", (ans: string): void => {
            console.log("answer: user2 has replied with" + ans); // for dev purpose  
            if (ans === "n") {
              modalHandler.hide();
              modalHandler.show("connection-rejected");
            }
            else if (ans === "y") {
              modalHandler.hide();
              const showContainer = document.querySelector("body > .show-container") as HTMLElement;
              setMessageForm();
              showChild(showContainer, 2);
            }
          });
        } else {
          debug("Socket variable undefined");
        }
      });

      modalHandler.once("cancelConnection", (): void => {
        if (socket) {
          socket.emit("cancelOffer");
        } else {
          debug("Socket variable undefined");
        }
      });
    }
    else if (dataUserType == "Wants to connect") {
      const user1Name: string = element.innerText;
      modalHandler.setUser2Name(user1Name);
      modalHandler.show("approve-request");
      // Show accept request alert
      modalHandler.once("connect", (): void => {
        const msg = {
          user1_name: user1Name,
          answer: "y"
        };

        if (socket) {
          socket.emit("answer", msg);
          setMessageForm();
          const showContainer = document.querySelector("body > .show-container") as HTMLElement;
          showChild(showContainer, 2);
        } else {
          debug("Socket variable undefined");
        }
      });

      modalHandler.once("rejectRequest", (): void => {
        const msg = {
          user1_name: user1Name,
          answer: "n"
        };
        element.dataset.userType = "idle";

        if (socket) {
          socket.emit("answer", msg);
        } else {
          debug("Socket variable undefined");
        }
      });
    }
  }

  const getUserButton = (username: string, userType: string): HTMLButtonElement => {
    const button = document.createElement("button");
    button.innerText = username;
    button.className = "user";
    button.setAttribute("data-user-type", userType);
    button.addEventListener("click", (): void => {
      connectToUser(button);
    })
    return button;
  }

  socket.on('login', (usersArray: [string, IUser][]): void => {
    const users: Map<string, IUser> = new Map(usersArray);
    console.log("list sent by server");
    console.log(users);
    if (users !== null) {
      // hiding page 1 and showing page 2
      showChild(document.querySelector("body > main"), 1);
      const onlineUsersList: Element | null = document.getElementById("onlineUsersList");
      if (onlineUsersList !== null) {
        users.forEach((value: IUser, key: string): void => {
          const button = getUserButton(key, value.state);
          onlineUsersList.append(button);
        });
      }
    }
  });

  socket.on("newUserLogin", (user: { username: string; val: IUser }): void => {
    console.log("newUserLogin:");
    console.log(user.username);
    if (user) {
      const onlineUsersList: Element | null = document.getElementById("onlineUsersList");
      if (onlineUsersList !== null) {
        const button = getUserButton(user.username, user.val.state);
        onlineUsersList.append(button);
      }
    }
  });

  socket.on("userDisconnected", (username: string): void => {
    console.log(username + " disconnected"); // for dev purpose
    if (username) {
      const onlineUsersList: Element | null = document.getElementById("onlineUsersList");
      if (onlineUsersList !== null) {
        let i = 0;
        const allListElements: HTMLCollection = onlineUsersList.children;
        for (i = 0; i < allListElements.length; i++) {
          if (allListElements[i].innerHTML === username) {
            onlineUsersList.removeChild(allListElements[i]);
            break;
          }
        }
      }
    }
  });

  socket.on("changeDataUserType", (userAndData: { username: string; newDataType: string }): void => {
    const username = userAndData.username;
    const newDataType = userAndData.newDataType;
    if (username && (newDataType == "idle" || newDataType == "busy" || newDataType == "Wants to connect")) {
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
        // changing the state of ith user
        let button = onlineUsersList.children[i];
        button.setAttribute("data-user-type", newDataType);
      }
    }
  });

  socket.on("messageSentSuccess", (msg: Msg): void => {
    // message is sent successfully to user2 and now will be shown in user1 chatbox
    const username = msg.username;
    if (username) {
      addNewMessage(msg, "sender");
    }
  });

  socket.on("messageIncomming", (msg: Msg): void => {
    // message is received successfully by user2 and now will be shown in user2 chatbox
    const username = msg.username;
    if (username) {
      addNewMessage(msg, "receiver");
    }
  });
  
};

const loginForm = document.querySelector("#login-page form") as HTMLFormElement;
loginForm.onsubmit = (e): void => {
  e.preventDefault();
  const usernameTextBox = loginForm.querySelector('input[type="text"]') as HTMLInputElement;
  const username = usernameTextBox.value;
  console.log(username);
  if (username !== "") {
    socket = io(window.location.origin, { query: `username=${username}` });
    socket.on("isSuccessfulLogin", (isSuccess: boolean): void => {
      if (isSuccess) {
        setSocketConnections();
      }
      else {
        window.alert("A user with this username is already live on the server");
        socket = undefined;
      }
    });

  } else {
    window.alert("Please enter a username"); //TODO: Fix with a warning shown by text box border
  }
}

const manageCollapseClickListener = (enable: boolean): void => {
  const sections = document.querySelectorAll(".page > section");
  const collapseClass = "my-collapse";
  sections.forEach((section): void => {
    if (section.firstElementChild == null) {
      return;
    }

    const onClick = (): void => {
      section.classList.toggle(collapseClass);
    };

    if (enable) {
      section.firstElementChild.addEventListener("click", onClick);
    } else {
      section.firstElementChild.removeEventListener("click", onClick);
    }
  });
};

const manageCheckboxConnectedPage = (): void => {
  let selectAllCheckbox = document.querySelector("#connected-page thead input[type=\"checkbox\"]") as HTMLInputElement | null;
  let fileCheckboxes = document.querySelectorAll("#connected-page tbody input[type=\"checkbox\"]") as NodeListOf<HTMLInputElement>;

  if (selectAllCheckbox === null) {
    debug("No Select All checkbox found in User connected page");
    return; // Nothing to do if there's no selectAll checkbox;
  }

  let numChecked = 0;

  selectAllCheckbox.addEventListener("change", (): void => {
    if (selectAllCheckbox === null) {
      debug("No Select All checkbox found in User connected page");
      return; // Nothing to do if there's no selectAll checkbox;
    }

    let checked = selectAllCheckbox.checked;

    if (checked) numChecked = fileCheckboxes.length;
    else numChecked = 0;

    fileCheckboxes.forEach((checkbox): void => {
      checkbox.checked = checked;
    });
  });

  const setMainCheckbox = (): void => {
    if (selectAllCheckbox === null) {
      debug("No Select All checkbox found in User connected page");
      return; // Nothing to do if there's no selectAll checkbox;
    }

    if (numChecked === fileCheckboxes.length) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else if (numChecked === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.indeterminate = true;
      selectAllCheckbox.checked = false;
    }
  }

  fileCheckboxes.forEach((checkbox): void => {
    if (checkbox.checked) numChecked++;
    setMainCheckbox();

    checkbox.addEventListener("change", (): void => {
      if (checkbox.checked) numChecked++;
      else numChecked--;
      setMainCheckbox();
    });
  });
}

/*
  Relies on #getFile to be <input type="file"> and to be immediately followed
  by label, table and then a button.
*/
const manageFileInput = (): void => {
  const inputElem = document.querySelector("#getFile") as HTMLInputElement
  const label = inputElem.nextElementSibling as HTMLLabelElement;
  const table = label.nextElementSibling as HTMLTableElement;
  const sendButton = table.nextElementSibling as HTMLButtonElement;

  const showTableFiles = (show: boolean): void => {
    if (show) {
      table.style.display = "initial";
      sendButton.style.display = "initial";
    }
    else {
      table.style.display = "none";
      sendButton.style.display = "none";
    }
  }

  const updateTable = (): void => {
    const files = inputElem.files
    if (!files || files.length === 0) {
      showTableFiles(false);
    } else {
      showTableFiles(true);
      const tbody = table.tBodies[0];
      tbody.innerHTML = ""; // Since only one tbody is there.
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let row = document.createElement("tr");
        let fileNameCell = document.createElement("td");
        let sizeCell = document.createElement("td");

        fileNameCell.innerHTML = file.name;
        sizeCell.innerHTML = formatBytes(file.size);
        row.append(fileNameCell, sizeCell);

        tbody.appendChild(row);
      }
    }
  }

  updateTable();
  inputElem.addEventListener("change", (): void => {
    updateTable();
  });

  sendButton.addEventListener("click", (): void => {
    if (socket === undefined) {
      return;
    }

    socket.emit("fileListSendRequest", inputElem.files);

    const container = document.querySelector("#connected-page show-container") as HTMLElement | null;
    if (container) {
      showChild(container, 2); //wait-approval page
    }
  });
}

window.addEventListener("load", (): void => {
  const mediaQueryList = window.matchMedia("(max-width: 767px)");
  const handleSizeChange = (evt: MediaQueryList | MediaQueryListEvent): void => {
    manageCollapseClickListener(evt.matches);
  };
  mediaQueryList.addListener(handleSizeChange);
  handleSizeChange(mediaQueryList);
  window.showChild = showChild; /* For debugging */
  manageCheckboxConnectedPage();
  manageFileInput();
});
