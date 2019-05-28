import { formatBytes } from './util'
import WebTorrent = require('webtorrent')
const debug = require('debug')('FileSend-WebTorrent')
const EventEmitter = require('events').EventEmitter

/*
* A client for sending and receiving files, which internally
* uses a WebTorrent client. 
* 
* Events emitted:
*   - **error**
*		- err: string | Error
*	- **upload** (Emitted whenever new packets are uploaded, for showing upload stats)
*		- uploaded: string (formatted as '20 MB' for example)
*		- uploadSpeed: string (formatted as '4 MB/s' for example)
*	- **download** (Emitted whenever new packets are downloaded, for showing download stats) (Note: these have same format as above)
*		- downloaded: string
*		- downloadSpeed: string
*		- progress: number (between 0 and 1)
*	- **downloadComplete**
*		- url: string (Downloaded file's BlobURL) 
*/
export class Client extends EventEmitter {
    private socket: SocketIOClient.Socket;
    private readonly TRACKER_URLS: string[];
    private readonly client: WebTorrent.Instance;

    /* 
    * Assuming use of SocketIO for comm. to server.
    * socket is the socket object of client connected.
    */
    constructor(socket: SocketIOClient.Socket) {
        super();
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

        this.TRACKER_URLS = [ TRACKER_URL ];

        this.socket = socket;
        this.socket.on('addTorrent', (magnetUri: string) => {
            this.addTorrent(magnetUri);
        });
    }

    sendFile = (file: File) => {
        this.client.seed(file, { announce: this.TRACKER_URLS } ,(torrent) => {
            this.socket.emit('fileReady', torrent.magnetURI);

            torrent.on('upload', (bytes) => {
                this.emit('upload', {
                    uploaded: formatBytes(torrent.uploaded),
                    uploadSpeed: formatBytes(torrent.uploadSpeed) + '/s',
                });
            });

            this.socket.on('torrentDone', (magnetUri: string) => {
                torrent.destroy(() => {
                    debug('Torrent destroyed, as server sent torrentDone');
                });
            });
        });
    }

    addTorrent = (magnetURI: string) => {
        this.client.add(magnetURI, { announce: this.TRACKER_URLS }, (torrent) => {
            torrent.on('error', (err) => {
                debug(`Error with torrent ${torrent.name}: ${err.toString()}`);
            });

            torrent.on('done', () => {
                debug('Torrent download complete');
                this.socket.emit('downloadComplete');

                torrent.files[0].getBlobURL((err, url) => {
                    if (err) {
                        console.error(err);
                        this.emit('error', err);
                        return;
                    }
                    if (url === undefined) {
                        console.error("Got empty File Blob URL");
                        this.emit('error', 'Got empty file Blob URL');
                        return;
                    }

                    this.emit('downloadComplete', url);
                })
                
                torrent.files[0].appendTo('body'); //INFO: For debugging
            });

            torrent.on('download', (bytes) => {
                this.emit('download', { 
                    downloaded: formatBytes(torrent.downloaded),
                    downloadSpeed: formatBytes(torrent.downloadSpeed) + '/s',
                    progress: torrent.progress,
                });
            });
        });
    }
}