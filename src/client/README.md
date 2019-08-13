# Directory structure

Here, we attempt to explain what's the purpose of each file in the directory.

#### Filenames ending in Page

The filename ending in Page contain the functions to show that page and do proper setups for them.

In general, setup would involve setting up the socket variables to emit required events to the server and also setting handlers for events that a user on this page may receive. It is also responsible for showing the next page to the user.

The pages with a brief description of what they do are as follows:

- Login Page: Prompt the user for password and connect to server
- Users Page: Display the list of users connected so that the user may connect with them
- Connected Page: When 2 users are connected. Involves two main sections which have their own pages:
  - Section 1:
    - File Select Send Page: User selects files to send
    - Wait approval page: User is shown info that other user is selecting the files they want to receive (no .ts file, functionality merged with file select send page).
    - Accept files page: The other user selects the files they want to receive
    - Processing Files page: Shown when files are being processed by the underlying WebTorrent client (does not have a .ts file, functionality merged with file progress page)
    - File Progress Page (progressUpdatesPage.ts): Shows the progress updates for the file transfer.

#### wt.ts

This file contains methods for initialising a WebTorrent client and provides methods to send files and pause file downloads. Socket events are handled in the file itself.

#### util.ts

Contains some utility functions for formatting size, time and showing particular pages.

#### modal.ts

Contains functions for showing modals. Modals are used for showing information to the user and are dismissible.

#### partnerDisconnectedHandler.ts

Sets handlers for the partnerDisconnected socket event sent by the server. A different file was created for this as there may be different responses to this event based on where the user is. For example, if no file transfer has begun, it's safe to transfer the user to the Users Page, while if some data has been transferred, it's better to keep them on the same page as they might want to download the already transferred files.

#### main.ts

Main entry point of JS execution. Shows the login page.
