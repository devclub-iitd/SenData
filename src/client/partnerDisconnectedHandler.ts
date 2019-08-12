import * as debugLib from "debug";
import { showMainPage } from "./util";

const debug = debugLib("FileSend:PartnerDisconnectedHandler");

class PartnerDisconnectedHandler {
  private socket: SocketIOClient.Socket | null = null;

  // Determines if the user has been disconnected from the other user, when
  // it gets partnerDisconnected event from server
  public isDisconnected = (): boolean => { return true; };

  public setSocket = (socket: SocketIOClient.Socket | null): PartnerDisconnectedHandler => {
    this.socket = socket;
    return this;
  };

  public callback = (): void => {};

  private connectToOthers = (): void => {
    if (this.isDisconnected()) {
      if (this.socket) {
        this.socket.emit("readyToConnectToOthers");
      } else {
        debug("Socket null. Can't send readyToConnectToOthers event");
      }

      debug("Partner disconnected. Showing user page");
      showMainPage("usersPage");
      this.callback();
    }
  };

  public setup = (): void => {
    if (this.socket == null) {
      debug("Socket not set. Can't setup");
      return;
    }

    this.socket.on("partnerDisconnected", this.connectToOthers);
  };
}

export default new PartnerDisconnectedHandler();