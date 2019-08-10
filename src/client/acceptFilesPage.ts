import * as debugLib from "debug";
import { showChild, formatBytes } from "./util";
import progressUpdatesPage from "./progressUpdatesPage";

const debug = debugLib("FileSend:AcceptFilesPage");

class AcceptFilesPage {
  private selectAllCheckbox = document.querySelector("#connected-page thead input[type=\"checkbox\"]") as HTMLInputElement;
  private fileCheckboxes = document.querySelectorAll("#connected-page tbody input[type=\"checkbox\"]") as NodeListOf<HTMLInputElement>;
  private transferButton = document.querySelector("#approve-files button") as HTMLButtonElement;
  private numChecked = 0;
  private files: FileList | undefined;

  private setTransferButtonText = (): void => {
    if (this.numChecked === 0) {
      this.transferButton.innerText = "Reject file request";
    } else {
      this.transferButton.innerText = "Start transfer";
    }
  };

  private onChangeSelectAllCheckbox = (): void => {
    if (this.selectAllCheckbox === null) {
      debug("No Select All checkbox found in User connected page");
      return; // Nothing to do if there's no selectAll checkbox;
    }
  
    let checked = this.selectAllCheckbox.checked;
  
    if (checked) this.numChecked = this.fileCheckboxes.length;
    else this.numChecked = 0;
  
    this.setTransferButtonText();
  
    this.fileCheckboxes.forEach((checkbox): void => {
      checkbox.checked = checked;
    });
  };

  private setMainCheckbox = (): void => {
    if (this.numChecked === this.fileCheckboxes.length) {
      this.selectAllCheckbox.checked = true;
      this.selectAllCheckbox.indeterminate = false;
    } else if (this.numChecked === 0) {
      this.selectAllCheckbox.checked = false;
      this.selectAllCheckbox.indeterminate = false;
    } else {
      this.selectAllCheckbox.indeterminate = true;
      this.selectAllCheckbox.checked = false;
    }

    this.setTransferButtonText();
  };

  private setFilesDisplay = (files: FileList): void => {
    const approveFilesTBody = document.querySelector("#approve-files tbody") as HTMLElement;
    approveFilesTBody.innerHTML = "";
    for (let i = 0; i < files.length; i++) {
      let row = document.createElement("tr");
      let cell1 = document.createElement("td");
      let label = document.createElement("label");
      let input = document.createElement("input");
      input.type = "checkbox";
      label.appendChild(input);
      let fileName = document.createElement("span");
      fileName.innerText = " " + files[i].name;
      label.appendChild(fileName);
      cell1.appendChild(label);
      row.appendChild(cell1);
      let cell2 = document.createElement("td");
      cell2.innerText = formatBytes(files[i].size);
      row.append(cell2);
      approveFilesTBody.append(row);
    }
  };

  public setup = (files: FileList): void => {
    this.selectAllCheckbox.onchange = this.onChangeSelectAllCheckbox;
    this.setFilesDisplay(files);

    this.fileCheckboxes = document.querySelectorAll("#connected-page tbody input[type=\"checkbox\"]") as NodeListOf<HTMLInputElement>;

    this.fileCheckboxes.forEach((checkbox): void => {
      if (checkbox.checked) this.numChecked++;
    
      checkbox.onchange = (): void => {
        if (checkbox.checked) this.numChecked++;
        else this.numChecked--;
        this.setMainCheckbox();
      };
    });
    this.setMainCheckbox();
    this.transferButton.onclick = this.onClickTransferButton;
  };

  private socket: SocketIOClient.Socket | null = null;
  public setSocket = (socket: SocketIOClient.Socket | null): AcceptFilesPage => {
    this.socket = socket;
    return this;
  };

  public show = (): void => {
    showChild(document.querySelector("#connected-page .show-container"), 1);
  };

  private onClickTransferButton = (): void => {
    const fileAnswers = Array.from(this.fileCheckboxes).map((checkbox): boolean => {
      return checkbox.checked;
    });

    if (this.socket === null) {
      debug("socket undefined. No transfer of files can happen");
      return;
    }
    
    this.socket.emit("fileListRequestAnswer", fileAnswers);
    const atleastOneFileAccepted = fileAnswers.reduce((acc, curr): boolean => {
      return acc || curr;
    });
    const showContainer = document.querySelector("#connected-page .show-container") as HTMLElement;
    if (atleastOneFileAccepted) {
      progressUpdatesPage.setSocket(this.socket).setupDownload();
      progressUpdatesPage.show();
    } else {
      showChild(showContainer, 0); //select-files-send
    }
  };
}

export default new AcceptFilesPage();