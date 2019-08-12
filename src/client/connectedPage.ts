import * as debugLib from "debug";
import { showChild } from "./util";
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