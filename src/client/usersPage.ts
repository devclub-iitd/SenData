import * as debugLib from "debug";
import { User } from "../types";
import modalHandler, { InformationModal } from "./modal";
import { showChild } from "./util";
import connectedPage from "./connectedPage";

const debug = debugLib("FileSend:UsersPage");

class UsersPage {
  private users: Map<string, User> = new Map<string, User>();
  private onlineUsersList: HTMLElement = document.getElementById("onlineUsersList") as HTMLElement;
  private socket: SocketIOClient.Socket | null = null;

  public show = (): void => {
    const showContainer = document.querySelector(".show-container") as HTMLElement;
    showChild(showContainer, 1); // Users page
  };

  private getUserButton = (username: string, userType: string): HTMLButtonElement => {
    const button = document.createElement("button");
    button.innerText = username;
    button.className = "user";
    button.setAttribute("data-user-type", userType);
    button.addEventListener("click", (): void => {
      this.connectToUser(button);
    });
    return button;
  };

  private connectToUser = (button: HTMLButtonElement): void => {
    // If socket is null, do nothing
    if (this.socket === null) {
      debug("Socket is null. Can't connect to user");
      return;
    }

    let userType = button.dataset.userType;
    modalHandler.setUser2Name(button.innerText);
    const user2Name = button.innerText;
    if (userType == "idle") {
      modalHandler.show("initiate-connection"); // Show send request alert

      modalHandler.once("connect", (): void => {
        if (this.socket) {
          this.socket.emit('offer', user2Name);
          this.socket.on("answer", (ans: string): void => {
            debug("answer: " + user2Name + " has replied with" + ans);
            if (ans === "n") {
              modalHandler.hide();
              modalHandler.show("connection-rejected");
            } else if (ans === "y") {
              modalHandler.hide();
              connectedPage.setSocket(this.socket).setup();
              connectedPage.show();
            }
          });

          this.socket.on("offeredUserDisconnected", (): void => {
            new InformationModal().setHeading(
              `${user2Name} disconnected`
            ).setBody(
              `The user you wanted to connect to disconnected`
            ).show();
          });
        } else {
          debug("Socket variable undefined");
        }
      });

      modalHandler.once("cancelConnection", (): void => {
        if (this.socket) {
          this.socket.emit("cancelOffer");
        } else {
          debug("Socket variable undefined");
        }
      });
    } else if (userType == "Wants to connect") {
      const user1Name: string = button.innerText;
      modalHandler.show("approve-request");

      const onCancelOffer = (username: string): void => {
        if (username !== user1Name) {
          return;
        }
        new InformationModal().setHeading(
          `${user1Name} cancelled connection offer`
        ).setBody(
          `${user1Name} cancelled their offer to connect with you.`
        ).show();

        if (!this.socket) {
          debug("Socket null.");
          return;
        }
        this.socket.removeListener("cancelOffer", onCancelOffer);
      };

      const onUserDisconnected = (disconnectedUserName: string): void => {
        if (disconnectedUserName === user1Name) {
          new InformationModal().setHeading(
            `${user1Name} disconnected`
          ).setBody(
            `They had sent you a request to connect but are now disconnected.`
          ).show();
        }
      };

      this.socket.on("cancelOffer", onCancelOffer);
      this.socket.on("userDisconnected", onUserDisconnected);
      modalHandler.on("modalsHidden", (): void => {
        if (this.socket) {
          this.socket.removeListener("cancelOffer", onCancelOffer);
          this.socket.removeListener("userDisconnected", onUserDisconnected);
        }
      });

      // Show accept request alert
      modalHandler.once("connect", (): void => {
        const msg = {
          user1_name: user1Name,
          answer: "y"
        };

        if (this.socket) {
          this.socket.emit("answer", msg);
          connectedPage.setSocket(this.socket).setup();
          connectedPage.show();
        } else {
          debug("Socket variable undefined");
        }
      });

      modalHandler.once("rejectRequest", (): void => {
        const msg = {
          user1_name: user1Name,
          answer: "n"
        };
        button.dataset.userType = "idle";

        if (this.socket) {
          this.socket.emit("answer", msg);
        } else {
          debug("Socket variable undefined");
        }
      });
    } else if (userType === "busy") {
      modalHandler.show("user-busy");
    }
  };

  public setUsers = (users: Map<string, User>): UsersPage => {
    if (users) {
      this.users = users;
    }

    this.onlineUsersList.innerHTML = "";
    users.forEach((value: User, key: string): void => {
      let state = "";
      if (value.state === "idle") {
        state = "idle";
      } else {
        state = "busy";
      }
      const button = this.getUserButton(key, state);
      this.onlineUsersList.append(button);
    });

    return this;
  };

  public setSocket = (socket: SocketIOClient.Socket | null): UsersPage => {
    this.socket = socket;
    return this;
  };

  private onNewUserLogin = (user: { username: string; val: User }): void => {
    debug("newUserLogin: " + user.username);
    if (user) {
      const onlineUsersList: Element | null = document.getElementById("onlineUsersList");
      if (onlineUsersList !== null) {
        const button = this.getUserButton(user.username, user.val.state);
        onlineUsersList.append(button);
      }
    }
  };

  private onUserDisconnected = (username: string): void => {
    debug(username + " disconnected"); // for dev purpose
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
  };

  private onChangeDataUserType = (userAndData: { username: string; newDataType: string }): void => {
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
              let button = onlineUsersList.children[i];
              button.setAttribute("data-user-type", newDataType);
              break;
            }
          }
        }
      }
    }
  };

  public setup = (): void => {
    if (this.socket === null) {
      debug("Socket is null. Can't set up");
      return;
    }
    
    this.socket.on("newUserLogin", this.onNewUserLogin);
    this.socket.on("userDisconnected", this.onUserDisconnected);
    this.socket.on("changeDataUserType", this.onChangeDataUserType);
  };
}

export default new UsersPage();