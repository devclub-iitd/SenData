# sendata
Simple tool for sending file in an Intranet environment

1) Go to the directory of the project in command prompt.
2) run "npm install --save"
3) run "node server.js" 
4) Open http://localhost:3001 

For local testing (sender-receiver on same pc, but different browser tabs), the above mentioned steps seem to be working fine. Otherwise,
a TURN server might be required to set up. For this purpose, install and run coturn. The commands are-
>sudo apt-get install coturn
For running the server-
>sudo turnserver -a -o -v -n  --no-dtls --no-tls -u test:test -r "someRealm"
>turnserver -v

(Taken from https://stackoverflow.com/questions/22233980/implementing-our-own-stun-turn-server-for-webrtc-application)

After doing this, in js/main.js file, change the value of TURN_SERVER_IP variable to your turn server ip address.\




FOR IITD intranet 
the following steps worked for me on Ubuntu (to run npm install --save)

##for npm
sudo npm config set proxy http://proxy22.iitd.ac.in:3128 -g
sudo npm config set https-proxy http://proxy22.iitd.ac.in:3128 -g
##first try above if doesnt work then do the below things
sudo npm config set strict-ssl false -g
sudo npm config set registry "http://registry.npmjs.org/" -g

