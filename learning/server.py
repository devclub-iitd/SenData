#!/usr/bin/python           # This is server.py file

import socket               # Import socket module
import threading

s = socket.socket()         # Create a socket object
host = socket.gethostname() # Get local machine name
port = 12346                # Reserve a port for your service.
s.bind(('', port))        # Bind to the port

s.listen(5)                 # Now wait for client connection.

def send():
	while True:
		x=raw_input()
		c.send(x)

def listen():
	while True:
		print c.recv(1024)

listener=threading.Thread(target=listen)
sender=threading.Thread(target=send)

while True:
	c, addr = s.accept()     # Establish connection with client.
	print 'Got connection from', addr
	listener.start()
	sender.start()
	#c.close()                # Close the connection
