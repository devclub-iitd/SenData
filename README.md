# SenData

## What is it all about?
SenData is a simple tool for sharing files at a high speed, aimed at an intranet environment without any external software. It is based to run simply using your internet browser. "ll coturn
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
1. Make bakend part of chat/file share history.
2. For transfering multiple files make queue of file requests...and execution 
3. Increase maximum limit of size of file that can be sent.
4. Set up functionality to send multiple files at once.

# Bugs List
~~1. Blob initiation on receving with Chrome not working.~~
