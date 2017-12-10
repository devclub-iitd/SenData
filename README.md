# SenData

## What is it all about?
SenData is a simple tool for sharing files at a high speed, aimed at an intranet environment without any external software. It is based to run simply using your internet browser.

### Technology used
The website is hosted on serber using nodeJs.

To signal messages and metadata between browsers, socket.io is used.

WebRTC is used to initiate a peer to peer connection between browsers and to send the file as a blob.

-----------------------------------------------------------------------------------------

## Getting Started: 
1. Install Nodejs on your computer.
2. Go to the directory of the project in command prompt and run "npm install".
3. Run "node server.js". 
4. Open http://localhost:3001. 

For local testing (sender-receiver on same pc, but different browser tabs), the above mentioned steps are observed to be working correctly. 

Otherwise, a TURN server might be required. For this purpose, install and run coturn. The commands are-

```bash
sudo apt-get install coturn
```

For running the server-

```bash
sudo turnserver -a -o -v -n  --no-dtls --no-tls -u test:test -r "someRealm"
turnserver -v
```

(Taken from https://stackoverflow.com/questions/22233980/implementing-our-own-stun-turn-server-for-webrtc-application)

After doing this, in js/main.js file, change the value of TURN_SERVER_IP variable to your turn server ip address.\


FOR IITD intranet 
the following steps are observed to work on Ubuntu (to run npm install --save)

1.for npm

```bash
sudo npm config set proxy http://proxy22.iitd.ac.in:3128 -g
sudo npm config set https-proxy http://proxy22.iitd.ac.in:3128 -g
```

2.Secondary Fix(If above does not work)

```bash
sudo npm config set strict-ssl false -g
sudo npm config set registry "http://registry.npmjs.org/" -g
```


-------------------------------------------------------------------------------------------------------------------------------------------

# TODO List
1. Increase and test speed of file sending.
2. Decrease site loading time.
3. Increase maximum limit of size of file that can be sent.
4. Set up functionality to send multiple files at once.

# Bugs List
~~1. Blob initiation on receving with Chrome not working.~~
