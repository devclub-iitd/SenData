import * as debugLib from "debug";
import { formatBytes, showChild } from "./util";
import modalHandler from "./modal";
import progressUpdatesPage from "./progressUpdatesPage";
import acceptFilesPage from "./acceptFilesPage";

const debug = debugLib("FileSend:FileSelectSendPage");

/*
  Relies on #getFile to be <input type="file"> and to be immediately followed
  by label, table and then a button.
*/
class FileSelectSendPage {
  private inputElem = document.querySelector("#getFile") as HTMLInputElement;
  private label = this.inputElem.nextElementSibling as HTMLLabelElement;
  private table = this.label.nextElementSibling as HTMLTableElement;
  private sendButton = this.table.nextElementSibling as HTMLButtonElement;

  private showContainer = document.querySelector("#connected-page .show-container") as HTMLElement;

  private showTableFiles = (show: boolean): void => {
    if (show) {
      this.table.style.display = "table";
      this.sendButton.style.display = "initial";
    }
    else {
      this.table.style.display = "none";
      this.sendButton.style.display = "none";
    }
  };

  private updateTable = (): void => {
    const files = this.inputElem.files;
    if (!files || files.length === 0) {
      this.showTableFiles(false);
    } else {
      this.showTableFiles(true);
      const tbody = this.table.tBodies[0];
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
  };

  private socket: SocketIOClient.Socket | null = null;

  public setSocket = (socket: SocketIOClient.Socket | null): FileSelectSendPage => {
    this.socket = socket;
    return this;
  };

  private onSendButtonClick = (): void => {
    if (this.socket === null) {
      debug("Socket undefined. Not sending file request");
      return;
    }
  
    this.socket.emit("fileListSendRequest", this.inputElem.files);
    showChild(this.showContainer, 2); //wait-approval page
  
    this.socket.on("fileListRequestAnswer", (acceptedFiles: boolean[]): void => {
      let atleastOneFileAccepted = false;
      acceptedFiles.forEach((fileAnswer): void => {
        if (fileAnswer) {
          atleastOneFileAccepted = true;
          return;
        }
      });
  
      if (!atleastOneFileAccepted) {
        modalHandler.show("file-request-rejected");
        showChild(this.showContainer, 0); //select-file-send page.
        return;
      }

      if (this.inputElem.files === null) {
        debug("files of input elem is null. No transfer would occur");
        return;
      }

      let filesToSend = new Array<File>();
      for (let i = 0; i < this.inputElem.files.length; i++) {
        if (acceptedFiles[i]) {
          filesToSend.push(this.inputElem.files[i]);
        }
      }
   
      progressUpdatesPage.setSocket(this.socket);
      progressUpdatesPage.setupUpload(filesToSend);
      progressUpdatesPage.show();
    });
  };

  private onFileListSendRequest = (files: FileList): void => {
    debug("Received fileListSendRequest. Processing..");
    acceptFilesPage.setSocket(this.socket).setup(files);
    acceptFilesPage.show();
  };

  public setup = (): void => {
    if (this.socket === null) {
      debug("Socket is null. Can't setup file send page");
      return;
    }

    this.updateTable();
    this.inputElem.onchange = (): void => {
      this.updateTable();
    };
    
    this.sendButton.onclick = this.onSendButtonClick;
    this.socket.on("fileListSendRequest", this.onFileListSendRequest);
  };

  public show = (): void => {
    const connectedPageShowContainer = document.querySelector("#connected-page .show-container") as HTMLElement;
    showChild(connectedPageShowContainer, 0); //select-files-send
  };
}

export default new FileSelectSendPage();
