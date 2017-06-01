# This is client.py file

import socket               # Import socket module
import threading
s = socket.socket()         # Create a socket object
#host = socket.gethostname() # Get local machine name
host='10.249.211.76'
port = 12346                # Reserve a port for your service.
s.connect((host, port))
flag=1
#s.bind('',12345)
def SendMessage(s):
	global flag
	while 1 and flag:
		a=raw_input('you>')
		if a=='exit': flag=0
		s.send(a)
	return

def ReceiveMessage(s):
	while 1 and flag:
		print 'shashwat>'+s.recv(1024)
	return
send_thread=threading.Thread(target=SendMessage,args=(s,))
receive_thread=threading.Thread(target=ReceiveMessage,args=(s,))
send_thread.start()
receive_thread.start()
#s.send('hi yo')
send_thread.join()
receive_thread.join()

s.close()                     # Close the socket when done
