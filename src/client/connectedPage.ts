import * as debugLib from "debug";
import { showChild } from "./util";
import fileSelectSendPage from "./fileSelectSendPage";
import chatPage from "./chatPage";

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
    mediaQueryList.addListener(handleSizeChange);
    handleSizeChange(mediaQueryList);
    chatPage.setSocket(this.socket).setup();
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