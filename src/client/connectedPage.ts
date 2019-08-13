import * as debugLib from "debug";
import { showChild, showMainPage } from "./util";
import fileSelectSendPage from "./fileSelectSendPage";
import chatPage from "./chatPage";
import partnerDisconnectedHandler from "./partnerDisconnectedHandler";
import { InformationModal } from "./modal";

const debug = debugLib("FileSend:ConnectedPage");

class ConnectedPage {
  private socket: SocketIOClient.Socket | null = null;

  public setSocket = (socket: SocketIOClient.Socket | null): ConnectedPage => {
    this.socket = socket;
    return this;
  };

  private manageCollapseClickListener = (enable: boolean): void => {
    const sections = document.querySelectorAll("#connected-page > .sections-div > section");
    const collapseClass = "my-collapse";
    sections.forEach((section): void => {
      if (section.firstElementChild == null) {
        return;
      }
  
      const onClick = (): void => {
        section.classList.toggle(collapseClass);
      };
  
      if (enable) {
        (section.firstElementChild as HTMLElement).onclick  = onClick;
      } else {
        (section.firstElementChild as HTMLElement).onclick = (): void => {};
      }
    });
  };

  private setupForceDisconnectHandlers = (): void => {
    const disconnectButton = document.querySelector("#connected-page > .disconnect-button-div > button") as HTMLButtonElement;
    disconnectButton.onclick = (): void => {
      if (this.socket === null) {
        debug("Socket is null. Disconnect button won't work");
        return;
      }

      if (window.confirm("Are you sure you want to disconnect?")) {
        this.socket.emit("disconnectFromPartner");
        this.socket.removeListener("partnerForcedDisconnect");
        showMainPage("usersPage");
      }
    };

    if (this.socket === null) {
      debug("Socket is null.");
      return;
    }

    this.socket.on("partnerForcedDisconnect", (): void => {
      new InformationModal().setHeading(
        "Your partner disconnected the connection with you"
      ).setBody(
        "The person you were connected to has manually disconnected. You will stay\
        on this page in case you want to download files or re-read chats. Click on\
        disconnect button to connect to other users"
      ).show();

      if (this.socket) {
        this.socket.removeListener("partnerForcedDisconnect");
      }
    });
  };

  public setup = (): void => {
    debug("Setting up media query handlers");
    const mediaQueryList = window.matchMedia("(max-width: 767px)");
    const handleSizeChange = (evt: MediaQueryList | MediaQueryListEvent): void => {
      this.manageCollapseClickListener(evt.matches);
    };
    mediaQueryList.onchange = handleSizeChange;
    handleSizeChange(mediaQueryList);
    chatPage.setSocket(this.socket).setup();
    partnerDisconnectedHandler.setSocket(this.socket).setup();
    partnerDisconnectedHandler.callback = (): void => {
      new InformationModal().setHeading(
        "Partner disconnected"
      ).setBody(
        "The user you were connected to disconnected"
      ).show();
    };
    this.setupForceDisconnectHandlers();
  };

  public show = (): void => {
    const showContainer = document.querySelector(".show-container") as HTMLElement;
    showChild(showContainer, 2); //connected-page

    fileSelectSendPage.setSocket(this.socket);
    fileSelectSendPage.setup();
    fileSelectSendPage.show();
  };
}

export default new ConnectedPage();