import { formatBytes } from './util'
import WebTorrent = require('webtorrent')
const debug = require('debug')('FileSend-WebTorrent')

export class Client {
    private socket: SocketIOClient.Socket;
    private readonly TRACKER_URL: string;
    private readonly client: WebTorrent.Instance;

    private downloadProgressUpdater: (
        downloaded: string, //Properly formatted download size
        downloadSpeed: string, 
        progress: number //Number b/w 0 and 1
    ) => void;
    
    private uploadProgressUpdater: (
        uploaded: string,
        uploadSpeed: string,
    ) => void;

    constructor(socket: SocketIOClient.Socket) {
        let STUN_URL: string, 
            TRACKER_URL: string;

        if (process.env.STUN_URL) {
            STUN_URL = `stun:${process.env.STUN_URL}:3478`;
        }
        else {
            STUN_URL = 'stun:stun.l.google.com:19302';
            debug(`STUN_URL env variable not set`)
        }
        debug(`Using ${STUN_URL} as STUN server address`);

        if (process.env.TRACKER_URL) {
            TRACKER_URL = `ws://${process.env.TRACKER_URL}:8000`;
        }
        else {
            TRACKER_URL = `wss://tracker.btorrent.xyz`;
            debug('TRACKER_URL env variable not set');
        }
        debug(`Using ${TRACKER_URL} as TRACKER address`);
        
        this.client = new WebTorrent({
            tracker: { 
                iceServers: [{ urls: STUN_URL }]
            }
        });

        this.TRACKER_URL = TRACKER_URL;

        this.downloadProgressUpdater = (a, b, c) => {};
        this.uploadProgressUpdater = (a, b) => {};

        this.socket = socket;
        this.socket.on('addTorrent', this.addTorrent)
    }

    setDownloadProgressUpdater = (downloadProgressUpdater: (downloaded: string, downloadSpeed: string, progress: number) => void) => {
        this.downloadProgressUpdater = downloadProgressUpdater
    }

    setUploadProgressUpdater = (uploadProgressUpdater: (uploaded: string, uploadSpeed: string) => void) => {
        this.uploadProgressUpdater = uploadProgressUpdater;
    }

    sendFile = (files: File | File[] | FileList) => {
        this.client.seed(files, { announce: [ this.TRACKER_URL ] } ,(torrent) => {
            this.socket.emit('fileReady', {
                magnetURI: torrent.magnetURI,
            });

            torrent.on('upload', (bytes) => {
                let uploaded = formatBytes(torrent.uploaded);
                let uploadSpeed = formatBytes(torrent.uploadSpeed) + '/s';
                this.uploadProgressUpdater(uploaded, uploadSpeed);
            });
        });
    }

    addTorrent = (opts: { magnetURI: string }) => {
        this.client.add(opts.magnetURI, { announce: [ this.TRACKER_URL ] }, (torrent) => {
            torrent.on('error', (err) => {
                debug(`Error with torrent ${torrent.name}: ${err.toString()}`);
            });

            torrent.on('done', () => {
                this.socket.emit('downloadComplete');
                torrent.files[0].appendTo('body');
            });

            torrent.on('download', (bytes) => {
                let downloaded = formatBytes(torrent.downloaded);
                let downloadSpeed = formatBytes(torrent.downloadSpeed) + '/s';
                let progress = torrent.progress;
                this.downloadProgressUpdater(downloaded, downloadSpeed, progress);
            });
        });
    }
}