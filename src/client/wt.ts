import * as debugLib from "debug";
import { EventEmitter } from "events";
import * as WebTorrent from "webtorrent";
import { formatBytes } from "./util";

const debug = debugLib("FileSend:WebTorrent");

/*
* A client for sending and receiving files, which internally
* uses a WebTorrent client.
*
* Events emitted:
*   - **error**
*		- err: string | Error
*	- **uploadProgress** (Emitted at some time intervals, for showing upload stats)
*       - progress: number (between 0 and 1)
*       - progressFiles: number[]
*       - timeRemaining: number (time remaining in milliseconds)
*		- uploaded: string (formatted as '20 MB' for example)
*		- uploadSpeed: string (formatted as '4 MB/s' for example)
*	- **downloadProgress** (Emitted at a time interval, for showing
  download stats) (Note: these have same format as above)
*		- downloaded: string
*		- downloadSpeed: string
*		- progress: number (between 0 and 1)
*       - progressFiles: number[]
*       - timeRemaining: number (time remaining in ms)
*   - **fileDownloadComplete** (Download of a file now complete)
*       - index: number (index of file whose download is complete)
*       - url: string (blobURL of the file downloaded)
*   - **seeding** (Begun seeding the file(s))
*   - **downloading** (Begun downloading the file(s))
*	- **downloadComplete**
*   - **torrentDestroyed** (the torrent that was downloading/seeding was destroyed)
*   - **clientDestroyed** (WebTorrent client was destroyed, possibly due to some error)
*/
export default class Client extends EventEmitter {
  public filesInfo: {
    name: string;
    size: string;
  }[] = [];
  private readonly socket: SocketIOClient.Socket;
  private readonly TRACKER_URLS: string[];
  private readonly client: WebTorrent.Instance;
  private readonly TIME_INTERVAL = 500; // Interval to report progress (ms)

  /*
    * Assuming use of SocketIO for comm. to server.
    * socket is the socket object of client connected.
    *
    * Uses STUN_URL and TRACKER_URL environment variables
    * for setting. If not set, falls back to third party
    * defaults.
    */
  public constructor(socket: SocketIOClient.Socket){
    super();
    let STUN_URL: string;
    let TRACKER_URL: string;

    if (process.env.STUN_URL) {
      STUN_URL = `stun:${process.env.STUN_URL}:3478`;
    } else {
      STUN_URL = "stun:stun.l.google.com:19302";
      debug(`STUN_URL env variable not set`);
    }
    debug(`Using ${STUN_URL} as STUN server address`);

    if (process.env.TRACKER_URL) {
      TRACKER_URL = `ws://${process.env.TRACKER_URL}:8000`;
    } else {
      TRACKER_URL = `wss://tracker.btorrent.xyz`;
      debug("TRACKER_URL env variable not set");
    }
    debug(`Using ${TRACKER_URL} as TRACKER address`);

    this.client = new WebTorrent({
      tracker: {
        iceServers: [{ urls: STUN_URL }],
      },
    });

    this.TRACKER_URLS = [ TRACKER_URL ];

    this.socket = socket;
    this.socket.on("addTorrent", (magnetUri: string): void => {
      debug("Received torrent. Adding..");
      this.addTorrent(magnetUri);
    });

    // Fatal errors, client is destroyed after encounter
    this.client.on("error", (err): void => {
      debug(`WebTorrent client encountered an error: ${err}`);
      this.emit("error", err);
      this.emit("clientDestroyed");
    });
  }

  public sendFiles = (files: File | File[] | FileList ): void => {
    this.client.seed(files, { announce: this.TRACKER_URLS } , (torrent): void => {
      this.setTorrentErrorHandlers(torrent);
      this.setFilesInfo(torrent);
      this.emit("seeding");
      this.socket.emit("fileReady", torrent.magnetURI);

      this.socket.on("downloadStarted", (): void => {
        this.emit("downloadStarted");
      });

      this.socket.on("progressUpdate", (info: {
        progress: number;
        progressFiles: number[];
        timeRemaining: number;
        uploaded?: string;
        uploadSpeed?: string;
      }): void => {
        info.uploaded = formatBytes(torrent.uploaded);
        info.uploadSpeed = formatBytes(torrent.uploadSpeed) + "/s";
        this.emit("uploadProgress", info);
      });

      torrent.on("upload", (): void => {
        this.emit("upload", {
          uploadSpeed: formatBytes(torrent.uploadSpeed) + "/s",
          uploaded: formatBytes(torrent.uploaded),
        });
      });

      this.socket.on("torrentDone", (): void => {
        torrent.destroy((): void => {
          debug("Torrent destroyed, as server sent torrentDone");
          this.emit("torrentDestroyed");
        });
      });
    });
  };

  /*
    * Expects an array of booleans to select and deselect files to download
    * E.g. Considering a torrent with 3 files, passing [true, false, true]
    * would result in first and third being selected, and second deselected
    */
  public selectFiles = (fileSelections: boolean[]): void => {
    const torrent = this.client.torrents[0]; // Only one torrent is being used.
    if (fileSelections.length !== torrent.files.length) {
      debug(`Got ${fileSelections.length} length of choices, expected ${torrent.files.length}`);
      debug("Ignored file selection choices");
    } else {
      torrent.deselect(0, torrent.pieces.length - 1, 0);
      for (let i = 0; i < torrent.files.length; i++) {
        const file = torrent.files[i];
        if (fileSelections[i]) {
          file.select();
        } else {
          file.deselect();
        }
      }
      debug("Implemented file selection choices");
    }
  };

  /*
    * Assumes all files of the torrent are to be downloaded as of now
    * Use selectFiles method to deselect files.
    */
  public addTorrent = (magnetURI: string): void => {
    this.socket.emit("downloadClientReady");
    this.socket.emit("Random emit");

    const torrent = this.client.add(magnetURI, { announce: this.TRACKER_URLS }, (): void => {
      this.emit("downloading");
      this.socket.emit("downloadStarted");
    });

    let downloadInfoInterval: number; // Unique ID of progress reporting interval
    let progressFiles: number[];

    const onDownload = (): void => {
      if (progressFiles === undefined) {
        progressFiles = new Array(torrent.files.length);
        for (let i = 0; i < progressFiles.length; i++) {
          progressFiles[i] = 0;
        }
      }

      torrent.files.forEach( (file, i): void => {
        progressFiles[i] = file.progress;
      });

      this.emit("downloadProgress", {
        downloadSpeed: formatBytes(torrent.downloadSpeed) + "/s",
        downloaded: formatBytes(torrent.downloaded),
        progress: torrent.progress,
        progressFiles,
        timeRemaining: torrent.timeRemaining,
      });
    };

    const fileDownloadComplete = new Array<boolean>(torrent.files.length);
    fileDownloadComplete.fill(false);
    const checkFileProgress = (): void => {
      torrent.files.forEach( (file, i): void => {
        if (!fileDownloadComplete[i] && file.progress === 1) {
          fileDownloadComplete[i] = true;
          file.getBlob( (err, blob): void => {
            if (err) {
              debug(`Obtaining file ${file.name}: ${err}`);
            } else if (blob === undefined) {
              debug(`Got undefined url for file ${file.name}`);
            } else {
              const url = URL.createObjectURL(blob);
              this.emit("fileDownloadComplete", {
                blob,
                index: i,
                url,
              });
            }
          });
        }
      });
    };

    torrent.on("metadata", (): void=> {
      progressFiles = new Array(torrent.files.length);
      for (let i = 0; i < progressFiles.length; i++) {
        progressFiles[i] = 0;
      }
      this.setFilesInfo(torrent);
    });

    let fileProgressCheckInterval: number;

    torrent.on("ready", (): void => {
      debug("Torrent beginning to download");
      fileProgressCheckInterval = window.setInterval(checkFileProgress, this.TIME_INTERVAL);

      const sendProgress = (): void => {
        this.socket.emit("progressUpdate", {
          progress: torrent.progress,
          progressFiles,
          timeRemaining: torrent.timeRemaining,
        });
      };

      downloadInfoInterval = window.setInterval((): void => {
        sendProgress();
        onDownload();
      }, this.TIME_INTERVAL);

      torrent.on("done", (): void => {
        let allFilesDownloaded = true;
        torrent.files.forEach((file): void => {
          if (file.progress !== 1) {
            allFilesDownloaded = false;
            return;
          }
        });

        if (allFilesDownloaded) {
          debug("Torrent download complete");
          this.socket.emit("downloadComplete");
          this.emit("downloadComplete");
          clearInterval(downloadInfoInterval);
          clearInterval(fileProgressCheckInterval);
          onDownload(); // To completely update download info
          checkFileProgress();
          sendProgress();
        } else {
          debug("All files set to download downloaded. Paused files remain");
          this.emit("pausedLeftOnly");
        }
      });
    });
  };

  // Should be used as client = client.destroy();
  public destroy = (): null => {
    this.client.destroy();
    return null;
  };

  private setFilesInfo = (torrent: WebTorrent.Torrent): void => {
    this.filesInfo = new Array(torrent.files.length);
    for (let i = 0; i < torrent.files.length; i++) {
      this.filesInfo[i] = {
        name: torrent.files[i].name,
        size: formatBytes(torrent.files[i].length)
      };
    }
  };

  private setTorrentErrorHandlers = (torrent: WebTorrent.Torrent): void => {
    // NOTE: torrents are destroyed when they encounter an error
    torrent.on("error", (err): void => {
      debug(`Torrent encountered an error: ${err}`);
      this.emit("error", err);
      this.emit("torrentDestroyed");
    });

    // Warnings are not fatal, but useful for debugging
    torrent.on("warning", (err): void => {
      debug(`Torrent warning: ${err}`);
    });
  };
}
