import * as debugLib from "debug";
import { link } from "fs";
import { IExtendedSocket, IUser, Msg } from "../types";
import Client from "./wt";

const debug = debugLib("FileSend:Main");

/* globals io */

/*
* Shows the ith child of targetNode by adding class show to that element
* and removing it from others.
*/
const showChild = (targetNode: HTMLElement | null, i: number): void => {
  if (targetNode) {
    targetNode.querySelectorAll(".show").forEach((elem: Element): void => {
      elem.classList.remove("show");
    });
    const t: HTMLElement | null = targetNode.children[i] as HTMLElement | null;
    if (t) {
      // If data-centered is present in child, add class centered to parent
      // Allows for a centered layout by an attribute of child
      if (t.dataset.centered !== undefined) {
        targetNode.classList.add("centered");
      }
      else {
        targetNode.classList.remove("centered");
      }
      t.classList.add("show");
    }
  }
};

const setSocketConnections = (socket: SocketIOClient.Socket): void => {
  // if send offer to a user
  // socket.emit('offer', user2name);
   
  const connectToUser = (element: HTMLElement): void => {
    let txt = "";
    let dataUserType = element.getAttribute("data-user-type");
    if (dataUserType == "idle") {
      const user2name = element.innerText;
      // Show send request alert
      if (confirm("Do you want to send request to " + user2name)) {
        txt = "You pressed OK!";
        socket.emit('offer', user2name);
      } else {
        txt = "You pressed Cancel!";
      }
    }
    else if (dataUserType == "Wants to connect") {
      const user1name: string = element.innerText;
      // Show accept request alert
      if (confirm("Do you want to accept request of " + user1name)) {
        txt = "You pressed OK!";
        const answer = "y"
        const msg = {
          user1_name: user1name,
          answer
        }
        socket.emit("answer", msg);
      } else {
        txt = "You pressed Cancel!";
        const answer = "n"
        const msg = {
          user1_name: user1name,
          answer
        }
        socket.emit("answer", msg);
      }
    }  
    console.log(txt)
  }

  // making connectToUser available globally so that we can have button.onclick listener in the test.html itself
  window.connectToUser = connectToUser
  
  socket.on('login', (usersArray: [string, IUser][]): void => {
    const users: Map<string, IUser> = new Map(usersArray);
    if (users !== null) {
      // hiding page 1 and showing page 2
      showChild(document.querySelector("body > main"), 1);
      const onlineUsersList: Element | null = document.getElementById("onlineUsersList");
      if (onlineUsersList !== null) {
        users.forEach((value: IUser, key: string): void => {
          const button = document.createElement("button");
          button.innerText = key;
          button.className = "user";
          button.setAttribute("data-user-type", value.state);
          button.setAttribute("onclick", "connectToUser(this)");
          onlineUsersList.append(button);
        });
      }
      /* for index.html
      const loginPage: HTMLElement | null = document.getElementById("loginPage");
      const dashboardPage: HTMLElement | null = document.getElementById("dashboardPage");
      if (loginPage !== null && dashboardPage !== null) {
        loginPage.style.display = "none";
        const onlineUsersList: Element | null = document.getElementById("onlineUsersList");
        users.forEach((value: IUser, key: string): void => {
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
      */
    }
  });

  socket.on("newUserLogin", (user: { username: string; val: IUser }): void => {
    if (user) {
      const onlineUsersList: Element | null = document.getElementById("onlineUsersList");
      if (onlineUsersList !== null) {
        const button = document.createElement("button");
        button.innerText = user.username;
        button.className = "user";
        button.setAttribute("data-user-type", user.val.state);
        button.setAttribute("onclick", "connectToUser(this)");
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

  socket.on("changeDataUserType", (userAndData: {username: string; newDataType: string}): void => {
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
  })
  socket.on("answer", (ans: string): void => {
    console.log("answer: user2 has replied with" + ans); // for dev purpose  
    if (ans === "n") {
      window.alert("Your request has been rejected");
    }
    else if (ans === "y") {
      // show page3 from here
      // 2 users are been connected
      window.alert("Your request has been accepted");
    }
  });

};



/* const usernameTextBox: HTMLInputElement = document.querySelector('#login-page input[type="text"]') as HTMLInputElement;
const connectToSocket = (): void => {
  const username = usernameTextBox.value;
  if (username !== "") {
    const socket: SocketIOClient.Socket = io(window.location.origin, {query: `username=${username}`});
    setSocketConnections(socket);
  } else {
    window.confirm("Please Enter some username");
  }
}; */

const loginForm = document.querySelector("#login-page form") as HTMLFormElement;
loginForm.onsubmit = (e): void => {
  e.preventDefault();
  const usernameTextBox = loginForm.querySelector('input[type="text"]') as HTMLInputElement;
  const username = usernameTextBox.value;
  console.log(username);
  if (username !== "") {
    const socket: SocketIOClient.Socket = io(window.location.origin, { query: `username=${username}` });
    setSocketConnections(socket);
  } else {
    window.alert("Enter a username ffs"); //TODO: Fix with a warning shown by text box border
  }
}
/* const startSendingButton: HTMLElement | null = document.querySelector('#login-page input[type="submit"]');
if (startSendingButton !== null) {
  startSendingButton.addEventListener("click", connectToSocket);
} */
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

const manageModalClickListener = (): void => {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal): void => {
    const closeButton = modal.querySelector(".close-btn");
    if (closeButton === null) {
      debug("No close button found in modal. Panicking!");
      return;
    }
    closeButton.addEventListener("click", (): void => {
      modal.classList.toggle("show");
    });
    window.addEventListener("click", (event): void => {
      if (event.target === modal) {
        modal.classList.toggle("show");
      }
    });
  });
}

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

window.onload = (): void => {
  const mediaQueryList = window.matchMedia("(max-width: 767px)");
  const handleSizeChange = (evt: MediaQueryList | MediaQueryListEvent): void => {
    manageCollapseClickListener(evt.matches);
  };
  mediaQueryList.addListener(handleSizeChange);
  handleSizeChange(mediaQueryList);
  // window.showChild = showChild; /* For debugging */
  manageModalClickListener();
  manageCheckboxConnectedPage();
};
