import * as debugLib from "debug";
import { User } from "../types";
import { showChild } from "./util";
import usersPage from "./usersPage";

const debug = debugLib("FileSend:LoginPage");

/* globals io */

class LoginPage {
  private socket: SocketIOClient.Socket | null = null;

  private onLogin = (usersArray: [string, User][]): void => {
    const users: Map<string, User> = new Map(usersArray);
    debug("list sent by server");
    debug(users);
    if (users !== null) {
      usersPage.setUsers(users).setSocket(this.socket);
      usersPage.show();
    }
  };

  private onIsSuccessfulLogin = (isSuccess: boolean, username: string): void => {
    if (isSuccess) {
      document.querySelectorAll(".my-username").forEach((elem): void => {
        (elem as HTMLElement).innerText = username;
      });

      if (this.socket === null) {
        debug("Socket null. Can't set socket connections");
        return;
      }
  
      this.socket.on('login', this.onLogin);
  
    } else {
      window.alert("A user with this username is already connected to the server");
      this.socket = null;
    }
  };

  private isSet = (): boolean => {
    return this.socket != null;
  };

  public setup = (): void => {
    const loginForm = document.querySelector("#login-page form") as HTMLFormElement;
    loginForm.onsubmit = (e): void => {
      e.preventDefault();
      const usernameTextBox = loginForm.querySelector('input[type="text"]') as HTMLInputElement;
      const username = usernameTextBox.value;
      debug(`Chosen username: ${username}`);
      if (username !== "") {
        this.socket = io(window.location.origin, { query: `username=${username}` });
        this.socket.on("isSuccessfulLogin", this.onIsSuccessfulLogin);
        usersPage.setSocket(this.socket).setup();
      } else {
        window.alert("Please enter a username"); //TODO: Fix with a warning shown by text box border
      }
    };
  };

  public show = (): void => {
    if (!this.isSet()) {
      this.setup();
    }

    showChild(document.querySelector(".show-container"), 0);
  };

  public unset = (): void => {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  };
}

export default new LoginPage();