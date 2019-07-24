import * as debugLib from "debug";
import * as JSZip from 'jszip';
import { saveAs } from "file-saver";
import modalHandler from "./modal";
import { IExtendedSocket, IUser, Msg } from "../types";
import WebTorrentClient from "./wt";
import { formatBytes, showChild, formatTime } from "./util";

const debug = debugLib("FileSend:Main");

/* globals io */

let socket: SocketIOClient.Socket | undefined; // The socket this client uses to connect

const showProgressUpdates = (client: WebTorrentClient): void => {
  const showContainer = document.querySelector("#connected-page .show-container") as HTMLElement;
  const progressTBody = document.querySelector('#file-progress-table tbody') as HTMLElement;
  progressTBody.innerHTML = "";

  showChild(showContainer, 4); // file-progress

  let progressElements = new Array<HTMLProgressElement>();
  for (let i = 0; i < client.filesInfo.length; i++) {
    const progressElement = document.createElement("progress");
    progressElement.max = 100;
    progressElement.value = 0;
    progressElements.push(progressElement);
  }

  client.filesInfo.forEach((file, i): void => {
    const row = document.createElement("tr");
    const cell1 = document.createElement("td");
    cell1.innerText = file.name;
    const cell2 = document.createElement("td");
    cell2.innerText = file.size;    
    const cell3 = document.createElement("td");
    cell3.appendChild(progressElements[i]);
    row.append(cell1, cell2, cell3);
    progressTBody.appendChild(row);
  });

  const totalProgress = document.querySelector("#total-progress") as HTMLProgressElement;
  const transferred = document.querySelector("#transferred") as HTMLElement;
  const transferSpeed = document.querySelector("#transfer-speed") as HTMLElement;
  const timeRemaining = document.querySelector("#time-remaining") as HTMLElement;

  client.on("downloadProgress", (info: {
    downloadSpeed: string;
    downloaded: string;
    progress: number;
    progressFiles: number[];
    timeRemaining: number;
  }): void => {
    progressElements.forEach((elem, i): void => {
      elem.value = info.progressFiles[i] * 100;
    });
    totalProgress.value = info.progress * 100;
    transferred.innerText = info.downloaded;
    transferSpeed.innerText = info.downloadSpeed;
    timeRemaining.innerText = formatTime(info.timeRemaining);
  });

  client.on("uploadProgress", (info: {
    progress: number;
    progressFiles: number[];
    timeRemaining: number;
    uploaded: string;
    uploadSpeed: string;
  }): void => {
    progressElements.forEach((elem, i): void => {
      elem.value = info.progressFiles[i] * 100;
    });
    totalProgress.value = info.progress * 100;
    transferred.innerText = info.uploaded;
    transferSpeed.innerText = info.uploadSpeed;
    timeRemaining.innerText = formatTime(info.timeRemaining);
  });

  const zip = new JSZip();
  const zipFolder = zip.folder("download");
  client.on("fileDownloadComplete", (file: {
    blob: Blob;
    index: number;
    url: string;
  }): void => {
    if (file.index < 0 || file.index >= progressElements.length) {
      debug(`Index ${file.index} file downloaded whereas there are only ${progressElements.length} files`);
      return;
    }

    let downloadElement = document.createElement("a");
    downloadElement.href = file.url;
    downloadElement.target = "_blank";
    downloadElement.download = client.filesInfo[file.index].name;
    downloadElement.innerText = "Download";
    progressElements[file.index].style.display = "none";
    
    const parentElement = progressElements[file.index].parentElement;
    if (parentElement) {
      parentElement.appendChild(downloadElement);
    } else {
      debug("Progress Element has no parent. How?!");
    }

    zipFolder.file(client.filesInfo[file.index].name, file.blob);
  });

  const downloadZipButton = document.querySelector("#download-zip") as HTMLButtonElement;
  downloadZipButton.onclick = (): void => {
    zip.generateAsync({type: "blob"}).then( (blob): void => {
      saveAs(blob, "download.zip");
    });
  }

  client.on("downloadComplete", (): void => {
    let extraInfo = downloadZipButton.nextSibling as HTMLElement | null;
    if (extraInfo) {
      extraInfo.innerText = "(All files)";
    }
  });
}

const manageCheckboxConnectedPage = (): void => {
  const selectAllCheckbox = document.querySelector("#connected-page thead input[type=\"checkbox\"]") as HTMLInputElement | null;
  const fileCheckboxes = document.querySelectorAll("#connected-page tbody input[type=\"checkbox\"]") as NodeListOf<HTMLInputElement>;
  const transferButton = document.querySelector("#approve-files button") as HTMLButtonElement;

  if (selectAllCheckbox === null) {
    debug("No Select All checkbox found in User connected page");
    return; // Nothing to do if there's no selectAll checkbox;
  }

  let numChecked = 0;

  const setTransferButtonText = (): void => {
    if (numChecked === 0) {
      transferButton.innerText = "Reject file request";
    } else {
      transferButton.innerText = "Start transfer";
    }
  }

  selectAllCheckbox.onchange = (): void => {
    if (selectAllCheckbox === null) {
      debug("No Select All checkbox found in User connected page");
      return; // Nothing to do if there's no selectAll checkbox;
    }

    let checked = selectAllCheckbox.checked;

    if (checked) numChecked = fileCheckboxes.length;
    else numChecked = 0;

    setTransferButtonText();

    fileCheckboxes.forEach((checkbox): void => {
      checkbox.checked = checked;
    });
  }

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

    setTransferButtonText();
  }

  fileCheckboxes.forEach((checkbox): void => {
    if (checkbox.checked) numChecked++;
    setMainCheckbox();

    checkbox.onchange = (): void => {
      if (checkbox.checked) numChecked++;
      else numChecked--;
      setMainCheckbox();
    }
  });

  transferButton.onclick = (): void => {
    const fileAnswers = Array.from(fileCheckboxes).map((checkbox): boolean => {
      return checkbox.checked;
    });

    if (socket === undefined) {
      debug("socket undefined. No transfer of files can happen");
      return;
    }
    socket.emit("fileListRequestAnswer", fileAnswers);
    const atleastOneFileAccepted = fileAnswers.reduce((acc, curr): boolean => {
      return acc || curr;
    });
    const showContainer = document.querySelector("#connected-page .show-container") as HTMLElement;
    if (atleastOneFileAccepted) {
      showChild(showContainer, 3); //processing-files

      const client = new WebTorrentClient(socket);
      client.on("downloading", (): void => {
        document.querySelectorAll(".download-only").forEach((element): void => {
          (element as HTMLElement).style.display = "initial";
        });
        document.querySelectorAll(".upload-only").forEach((element): void => {
          (element as HTMLElement).style.display = "none";
        });
        showProgressUpdates(client);
      });
    } else {
      showChild(showContainer, 0); //select-files-send
    }
  }
}

const setSocketConnections = (): void => {
  // if send offer to a user
  // socket.emit('offer', user2name);

  // If socket is undefined, do nothing
  if (socket === undefined) {
    return;
  }

  const getMessageBox = (username: string, messageValue: string, date: Date, senderOrReceiver: string): HTMLDivElement => {
    const div = document.createElement("div");

    const options = {
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }
    const humanReadableDate = Intl.DateTimeFormat('en-IN', options).format(date);

    div.innerHTML = `
                        <main>${messageValue}</main>
                        <aside><time datetime="${date.toString()}">${humanReadableDate}</time></aside>
                      `;
    div.className = "chat-message " + senderOrReceiver;
    return div;
  }

  const addNewMessage = (msg: Msg, senderOrReceiver: string): void => {
    const chatBox: Element | null = document.getElementById("chatBox");
    if (chatBox !== null) {
      if (chatBox !== null) {
        const button = getMessageBox(msg.username, msg.messageValue, msg.date, senderOrReceiver);
        chatBox.append(button);
        button.scrollIntoView(false);
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
          if (socket === undefined) {
            debug("socket undefined, not sending message");
            return;
          }
          
          socket.emit("message", messageValue);
          chatBoxTextBox.value = "";
        }
      }
    }

    let dataUserType = element.getAttribute("data-user-type");
    modalHandler.setUser2Name(element.innerText);
    const user2Name = element.innerText;
    if (dataUserType == "idle") {
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
              const connectedPageContainer = document.querySelector("#connected-page .show-container") as HTMLElement;
              showChild(connectedPageContainer, 0);
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
          const connectedPageContainer = document.querySelector("#connected-page .show-container") as HTMLElement;
          showChild(connectedPageContainer, 0);
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
    } else if (dataUserType === "busy") {
      modalHandler.show("user-busy");
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
        onlineUsersList.innerHTML = "";
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

  socket.on("fileListSendRequest", (files: FileList): void => {
    debug("Received fileListSendRequest. Processing..");
    const approveFilesTBody = document.querySelector("#approve-files tbody") as HTMLElement;
    approveFilesTBody.innerHTML = "";
    for (let i = 0; i < files.length; i++) {
      let row = document.createElement("tr");
      let cell1 = document.createElement("td");
      let label = document.createElement("label");
      let input = document.createElement("input");
      input.type = "checkbox";
      label.appendChild(input);
      let fileName = document.createElement("span");
      fileName.innerText = " " + files[i].name;
      label.appendChild(fileName);
      cell1.appendChild(label);
      row.appendChild(cell1);
      let cell2 = document.createElement("td");
      cell2.innerText = formatBytes(files[i].size);
      row.append(cell2);
      approveFilesTBody.append(row);
    }
    manageCheckboxConnectedPage();
    const showContainer = document.querySelector("#connected-page .show-container") as HTMLElement;
    showChild(showContainer, 1);
  });
  socket.on("messageSentSuccess", (msg: Msg): void => {
    // message is sent successfully to user2 and now will be shown in user1 chatbox
    msg.date = new Date(msg.date);
    addNewMessage(msg, "sender");
  });

  socket.on("messageIncoming", (msg: Msg): void => {
    // message is received successfully by user2 and now will be shown in user2 chatbox
    msg.date = new Date(msg.date);
    addNewMessage(msg, "receiver");
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
    let socketListenersSet = false;
    socket.on("isSuccessfulLogin", (isSuccess: boolean): void => {
      if (isSuccess) {
        // TEMP FIX. Show own username
        document.querySelectorAll(".my-username").forEach((elem): void => {
          (elem as HTMLElement).innerText = username;
        });

        if (!socketListenersSet) {
          socketListenersSet = true;
          setSocketConnections();
        }
        
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



/*
  Relies on #getFile to be <input type="file"> and to be immediately followed
  by label, table and then a button.
*/
const manageFileInput = (): void => {
  const inputElem = document.querySelector("#getFile") as HTMLInputElement
  const label = inputElem.nextElementSibling as HTMLLabelElement;
  const table = label.nextElementSibling as HTMLTableElement;
  const sendButton = table.nextElementSibling as HTMLButtonElement;

  const mainShowContainer = document.querySelector("body > .show-container") as HTMLElement;
  const showContainer = document.querySelector("#connected-page .show-container") as HTMLElement;

  const showTableFiles = (show: boolean): void => {
    if (show) {
      table.style.display = "table";
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

        fileNameCell.innerHTML = " " + file.name;
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
      debug("Socket undefined. Not sending file request");
      return;
    }

    socket.emit("fileListSendRequest", inputElem.files);
    showChild(showContainer, 2); //wait-approval page

    socket.on("fileListRequestAnswer", (acceptedFiles: boolean[]): void => {
      let atleastOneFileAccepted = false;
      acceptedFiles.forEach((fileAnswer): void => {
        if (fileAnswer) {
          atleastOneFileAccepted = true;
          return;
        }
      });

      if (!atleastOneFileAccepted) {
        modalHandler.show("file-request-rejected");
        showChild(showContainer, 0); //select-file-send page.
        return;
      }

      showChild(showContainer, 3); //processing-files

      if (socket === undefined) {
        debug("socket undefined, can't initialise webTorrent client");
        return;
      }
      let client = new WebTorrentClient(socket);
      let filesToSend = new Array<File>();

      if (inputElem.files === null) {
        debug("files of input elem is null. No transfer would occur");
        return;
      }

      for (let i = 0; i < inputElem.files.length; i++) {
        if (acceptedFiles[i]) {
          filesToSend.push(inputElem.files[i]);
        }
      }

      client.sendFiles(filesToSend);

      client.on("downloadStarted", (): void => {
        document.querySelectorAll(".download-only").forEach((element): void => {
          (element as HTMLElement).style.display = "none";
        });
        document.querySelectorAll(".upload-only").forEach((element): void => {
          (element as HTMLElement).style.display = "initial";
        });
        showProgressUpdates(client);
      });
    });
  });
}

window.addEventListener("load", (): void => {
  const mediaQueryList = window.matchMedia("(max-width: 767px)");
  const handleSizeChange = (evt: MediaQueryList | MediaQueryListEvent): void => {
    manageCollapseClickListener(evt.matches);
  };
  mediaQueryList.addListener(handleSizeChange);
  handleSizeChange(mediaQueryList);
  manageFileInput();
});
