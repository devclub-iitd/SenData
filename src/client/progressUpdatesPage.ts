import * as debugLib from "debug";
import * as JSZip from "jszip";
import { saveAs } from "file-saver";
import WebTorrentClient from "./wt";
import { showChild, formatTime } from "./util";
import partnerDisconnectedHandler from "./partnerDisconnectedHandler";
import { InformationModal } from "./modal";

const debug = debugLib("FileSend:ProgressUpdatesPage");

class ProgressUpdatesPage {
  private socket: SocketIOClient.Socket | null = null;
  private client: WebTorrentClient | null = null;
  private showContainer = document.querySelector("#connected-page .show-container") as HTMLElement;
  private isDownloading = false;

  public setSocket = (socket: SocketIOClient.Socket | null): ProgressUpdatesPage => {
    this.socket = socket;
    return this;
  };

  // Setup that is common to both downloading and uploading
  public commonSetup = (): void => {
    const isDisconnected = (): boolean => {
      if (this.client === null) {
        debug("Client is null for common setup.");
        return true;
      }
      if (this.client.isConnectedToAnyone()) {
        const modal = new InformationModal().setHeading(
          "Your partner disconnected from our server"
        );
        if (this.isDownloading) {
          modal.setBody(
            "If they're still connected via a peer-to-peer route, \
          you will see progress on your download. They, however, won't see the\
          upload progress update"
          );
        } else {
          modal.setBody(
            "They might still be connected via a peer-to-peer route even\
            though you won't see the upload progress being updated. \
            You should contact them through other means to confirm"
          );
        }
        modal.show();
        return false;
      }
      return true;
    };

    partnerDisconnectedHandler.isDisconnected = isDisconnected;
    partnerDisconnectedHandler.callback = (): void => {
      new InformationModal().setHeading(
        "You have been disconnected with your partner"
      ).setBody(
        "Your partner's peer-to-peer connection with you and the connection with\
        server was broken."
      ).show();
    };
  };

  public setupUpload = (filesToSend: File[]): void => {
    if (this.socket === null) {
      debug("socket undefined, can't initialise webTorrent client");
      return;
    }

    if (this.client !== null) {
      this.client = this.client.destroy(); // Might be remnant from a previous connection
    }

    this.client = new WebTorrentClient(this.socket);
    this.commonSetup();
    this.client.sendFiles(filesToSend);
    this.client.on("downloadStarted", this.onDownloadStarted);
  };

  public setupDownload = (): void => {
    if (this.socket === null) {
      debug("socket undefined, can't initialise webTorrent client");
      return;
    }

    if (this.client !== null) {
      this.client = this.client.destroy(); // Might be remnant from a previous connection
    }

    this.client = new WebTorrentClient(this.socket);
    this.commonSetup();
    this.setFileDownloadCompleteTriggers();
    this.client.on("downloading", (): void => {
      this.showProgressUpdates(true);
    });
  };

  public show = (): void => {
    showChild(this.showContainer, 3); //processing-files
  };

  public unset = (): void => {
    if (this.client) {
      this.client = this.client.destroy();
    }
  };

  private onDownloadStarted = (): void => {
    this.showProgressUpdates(false);
  };

  private transferData = new Array<HTMLSpanElement>();
  private progressTBody = document.querySelector('#file-progress-table tbody') as HTMLElement;

  // isDownloading => .upload-only elements are hidden
  // !isDownloading => .download-only elements are hidden
  private showProgressUpdates = (isDownloading: boolean): void => {
    this.isDownloading = isDownloading;
    this.progressTBody.innerHTML = "";
  
    if (isDownloading) {
      document.querySelectorAll(".download-only").forEach((element): void => {
        (element as HTMLElement).style.display = "revert";
      });
      document.querySelectorAll(".upload-only").forEach((element): void => {
        (element as HTMLElement).style.display = "none";
      });
    } else {
      document.querySelectorAll(".download-only").forEach((element): void => {
        (element as HTMLElement).style.display = "none";
      });
      document.querySelectorAll(".upload-only").forEach((element): void => {
        (element as HTMLElement).style.display = "revert";
      });
    }
  
    this.setProgressLayout(isDownloading);
    showChild(this.showContainer, 4); // file-progress
    this.setProgressListeners();
  
    if (this.client === null) {
      debug("WebTorrentClient is null");
      return;
    }

    this.client.on("downloadComplete", (): void => {
      let extraInfo = this.downloadZipButton.nextSibling as HTMLElement | null;
      if (extraInfo) {
        extraInfo.innerText = "(All files)";
      }
    });
  };


  private fileButtons = new Array<HTMLButtonElement>();
  
  private setProgressLayout = (isDownloading: boolean): void => {
    if (this.client === null) {
      debug("WebTorrentClient is null!");
      return;
    }

    let fileSelections = new Array<boolean>(this.client.filesInfo.length);// Indicates if ith file is to be downloaded or not
    fileSelections.fill(true);
  
    this.client.filesInfo.forEach((file, i): void => {
      const row = document.createElement("tr");
      const cell1 = document.createElement("td");
      cell1.innerText = file.name;
  
      const cell2 = document.createElement("td");
      const transferred = document.createElement("span");
      const totalSize = document.createElement("span");
      totalSize.innerText = "% of " + file.size;
      this.transferData.push(transferred);
      cell2.append(transferred, totalSize);
  
      row.append(cell1, cell2);
  
      const cell3 = document.createElement("td");
  
      if (isDownloading) {
        const pauseButton = document.createElement("button");
        pauseButton.innerText = "Pause";
        pauseButton.classList.add("pause-btn");
        pauseButton.onclick = (): void => {
          if (this.client === null) {
            debug("WebTorrentClient is null!");
            return;
          }

          if (pauseButton.innerText === "Pause") {
            fileSelections[i] = false;
            pauseButton.innerText = "Resume";
          } else if (pauseButton.innerText === "Resume") {
            fileSelections[i] = true;
            pauseButton.innerText = "Pause";
          }
          this.client.selectFiles(fileSelections);
        };
  
        this.fileButtons.push(pauseButton);
        cell3.appendChild(pauseButton);
        row.append(cell3);
      }
      this.progressTBody.appendChild(row);
    });
  };

  private setProgressListeners = (): void => {
    const totalProgress = document.querySelector("#total-progress") as HTMLProgressElement;
    const transferred = document.querySelector("#transferred") as HTMLElement;
    const transferSpeed = document.querySelector("#transfer-speed") as HTMLElement;
    const timeRemaining = document.querySelector("#time-remaining") as HTMLElement;

    if (this.client === null) {
      debug("WebTorrentClient is null");
      return;
    }
  
    this.client.on("downloadProgress", (info: {
      downloadSpeed: string;
      downloaded: string;
      progress: number;
      progressFiles: number[];
      timeRemaining: number;
    }): void => {
      this.transferData.forEach((element, i): void => {
        element.innerText = Math.round(info.progressFiles[i] * 100).toString();
      });
      totalProgress.value = info.progress * 100;
      transferred.innerText = info.downloaded;
      transferSpeed.innerText = info.downloadSpeed;
      timeRemaining.innerText = formatTime(info.timeRemaining);
    });
  
    this.client.on("uploadProgress", (info: {
      progress: number;
      progressFiles: number[];
      timeRemaining: number;
      uploaded: string;
      uploadSpeed: string;
    }): void => {
      this.transferData.forEach((element, i): void => {
        element.innerText = Math.round(info.progressFiles[i] * 100).toString();
      });
      totalProgress.value = info.progress * 100;
      transferred.innerText = info.uploaded;
      transferSpeed.innerText = info.uploadSpeed;
      timeRemaining.innerText = formatTime(info.timeRemaining);
    });
  };

  private downloadZipButton = document.querySelector("#download-zip") as HTMLButtonElement;
  private setFileDownloadCompleteTriggers = (): void => {
    if (this.client === null) {
      debug("WebTorrentClient is null!");
      return;
    }

    const zip = new JSZip();
    const zipFolder = zip.folder("download");
    this.client.on("fileDownloadComplete", (file: {
      blob: Blob;
      index: number;
      url: string;
    }): void => {
      if (file.index < 0 || file.index >= this.transferData.length) {
        debug(`Index ${file.index} file downloaded whereas there are only ${this.transferData.length} files`);
        return;
      }

      if (this.client === null) {
        debug("WebTorrentClient is null!");
        return;
      }
  
      let downloadElement = document.createElement("a");
      downloadElement.href = file.url;
      downloadElement.target = "_blank";
      downloadElement.download = this.client.filesInfo[file.index].name;
      downloadElement.innerText = "Download";
      this.fileButtons[file.index].style.display = "none";
  
      const parentElement = this.fileButtons[file.index].parentElement;
      if (parentElement) {
        parentElement.appendChild(downloadElement);
      } else {
        debug("Progress Element has no parent. How?!");
      }
  
      zipFolder.file(this.client.filesInfo[file.index].name, file.blob);
    });
  
    this.downloadZipButton.onclick = (): void => {
      zip.generateAsync({type: "blob"}).then( (blob): void => {
        saveAs(blob, "download.zip");
      });
    };
  };
}

export default new ProgressUpdatesPage();