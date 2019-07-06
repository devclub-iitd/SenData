import * as debugLib from "debug";
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
  socket.on('login', (usersArray: [string, IUser][]): void => {
    const users: Map<string, IUser> = new Map(usersArray);
    if (users) {
      // hiding page 1
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
    }
  });

  socket.on("newUserLogin", (user: { username: string; val: IUser }): void => {
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

  socket.on("userDisconnected", (username: string): void => {
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
    showChild(document.querySelector("body > main"), 1);
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
  window.showChild = showChild; /* For debugging */
  manageModalClickListener();
  manageCheckboxConnectedPage();
};
