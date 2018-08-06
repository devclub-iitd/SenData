#!/bin/bash

#taken from https://stackoverflow.com/questions/22233980/implementing-our-own-stun-turn-server-for-webrtc-application
apt-get update && apt-get install libssl-dev libevent-dev libhiredis-dev make -y    # install the dependencies
wget -O turn.tar.gz http://turnserver.open-sys.org/downloads/v4.5.0.6/turnserver-4.5.0.6.tar.gz     # Download the source tar
tar -zxvf turn.tar.gz     # unzip
cd turnserver-*
./configure
make && make install
sudo turnserver -a -o -v -n  --no-dtls --no-tls -u test:test -r "someRealm"