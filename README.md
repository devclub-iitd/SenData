# FileSend
Previously known as SenData

## What is it all about?
FileSend is a simple tool for sharing files at a high speed, aimed at an intranet environment without any external software. It runs on a modern web browser and is thus cross-platform and can be run on Windows, Linux, MacOS, Android, etc.

## How to use
The deployed version can be found at https://filesend.devclub.in (accessible only from IITD intranet). Users need to enter a username to login, which would be used by other users who want to connect to them.

## Basic Working
We use [WebTorrent](webtorrent.io) for transferring files in a peer-to-peer way and [SocketIO](socket.io) for initially connecting the users. A torrent is created when the files to be sent are created and the user is set to seed it. This torrent is then sent to the other user who adds it and so the files are transferred.

## Deploying
The working of FileSend requires a STUN server and a Torrent tracker. They can be easily deployed locally by using Docker containers from Docker Hub. The following commands can be used for this:
```sh
docker run -d -p 3478:3478 -p 3478:3478/udp zolochevska/turn-server username password realm
docker run --rm -d -p 8000:8000 henkel/bittorrent-tracker:latest
```
These servers are now running on localhost. To indicate their, address you need to set the environment variables as follows:
```sh
export TRACKER_URL="ws://localhost:8000"
export STUN_URL="stun:localhost:3478"
```

Note that you can use 3rd party deployed tracker and STUN servers too and set the environment variables accordingly, only requirement being they should be reachable by the users who want to transfer data.

To build and run the web app, make sure you are in the root directory of the project. Then, run the following commands:
```sh
npm install
npm run build
npm start
```
The web app would be visible at `localhost:7000`

## Directory structure
```
|- src/
   |- client/ - Client side code
   |- server/ - Server side code
   |- @types - Contains type definitions for some modules used
   |- types.ts - Types common to server and client
|- public/
   |- scss/ - Contains styles written in SCSS
   |- css/ - Contains styles compiled from scss/ + additional styles
   |- webfonts/ - Fonts
   |- js/ - JS files compiled from src/client/ + Other 3rd party JS files
|- build/ - JS files compiled from corresponding TS files in src/
   |- client/ - TS files are compiled from src/client/ and then browserified into a single file which is placed in public/js/
```

## WebTorrent Details
WebTorrent relies on WebRTC (Web Real-Time Communication) for establishing peer-to-peer connections. Due to a very presence of Network Address Translators, connecting to another peer using their IP addresss directly is not possible they are in the same subnet. To facilitate the connection, a STUN server is required. In simple terms, both users connect to  the STUN server and through established protocols, the server establishes a connection between them. This connection is not routed through the STUN server and is a shorter route. For a much more involved description, see [State of Peer-to-Peer (P2P) Communication across Network Address Translators (NATs)](https://tools.ietf.org/html/rfc5128)
