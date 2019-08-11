import { EventEmitter } from "events";
import * as debugLib from "debug";
import { showChild } from "./util";

const debug = debugLib("FileSend:Modal");

// Simple Modal for displaying some info to the user
export class InformationModal {
  private heading: string = "";
  private body: string = "";

  public setHeading = (heading: string): InformationModal => {
    this.heading = heading;
    return this;
  };

  public setBody = (body: string): InformationModal => {
    this.body = body;
    return this;
  };

  public show = (): void => {
    const modal = document.querySelector("#information-modal") as HTMLElement;
    const headingSpan = modal.querySelector(".heading") as HTMLElement;
    const bodySpan = modal.querySelector(".body") as HTMLElement;

    headingSpan.innerText = this.heading;
    bodySpan.innerText = this.body;

    document.querySelectorAll(".modal").forEach((modal): void => {
      modal.classList.remove("show");
    });

    modal.classList.add("show");
  };
}

class Modal extends EventEmitter {
  private user2Name: string | undefined;

  public constructor() {
    super();
    window.addEventListener("load", (): void => {
      this.setupModals();
    });
  }

  public setUser2Name = (user2Name: string): void => {
    this.user2Name = user2Name;
    document.querySelectorAll(".modal .user2-name").forEach((element): void => {
      element.innerHTML = user2Name;
    });
  };

  public show = (type: string): void => {
    this.removeAllListeners(); // TODO: Bit weird but it's fine if we ensure that listeners
    // for a particular modal are added after calling this function
    // Ensures that no unneeded listeners are there. Could we move this to where listeners are added?
    let modal = document.querySelector("#modal-" + type);
    if (modal) {
      modal.classList.add("show");
      const showContainer = modal.querySelector(".show-container") as HTMLElement;
      showChild(showContainer, 0);
    } else {
      debug(type + ": Unsupported type of modal. Doing nothing");
    }
  };

  public hide = (): void => {
    document.querySelectorAll(".modal").forEach((modal): void => {
      modal.classList.remove("show");
    });
    this.emit("modalsHidden");
  };

  private setupModals = (): void => {
    document.querySelectorAll(".modal").forEach((modal): void => {
      const hideModal = (): void => {
        modal.classList.remove("show");
        this.emit("modalsHidden");
      };

      const showContainer = modal.querySelector(".show-container") as HTMLElement;
      const closeButton = modal.querySelector("button.close-btn") as HTMLButtonElement;
      const noButton = modal.querySelector("button[data-btn-type=\"no\"]") as HTMLButtonElement;
      const yesButton = modal.querySelector("button[data-btn-type=\"yes\"]") as HTMLButtonElement;

      // Close directly if request not sent. Otherwise, confirm first.
      const closeMaybeConfirm = (): void => {
        // If first element contains show class, close directly; otherwise confirm
        if (
          showContainer.children[0].classList.contains("show") ||
          confirm("Do you want to cancel the connection request to " + this.user2Name + "?")
        ) {
          this.emit("cancelConnection");
          hideModal();
        }
      };

      if (modal.id === "modal-initiate-connection") {
        closeButton.addEventListener("click", closeMaybeConfirm);
        window.addEventListener("click", (event): void => {
          if (event.target === modal) {
            closeMaybeConfirm();
          }
        });
        yesButton.addEventListener("click", (): void => {
          this.emit("connect");
          showChild(showContainer, 1);
          const cancelButton = showContainer.querySelector(".page:nth-child(2) button") as HTMLButtonElement;

          cancelButton.addEventListener("click", (): void => {
            this.emit("cancelConnection");
            hideModal();
          });
        });
        noButton.addEventListener("click", hideModal);
      } else if (modal.id === "modal-approve-request") {
        yesButton.addEventListener("click", (): void => {
          this.emit("connect");
          hideModal();
        });
        noButton.addEventListener("click", (): void => {
          this.emit("rejectRequest");
          hideModal();
        });
        closeButton.addEventListener("click", hideModal);
        window.addEventListener("click", (event): void => {
          if (event.target === modal) {
            hideModal();
          }
        });
      } else {
        closeButton.addEventListener("click", hideModal);
        window.addEventListener("click", (event): void => {
          if (event.target === modal) {
            hideModal();
          }
        });
      }
    });
  };
}

export default new Modal();