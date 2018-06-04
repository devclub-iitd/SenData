$(() => {
//   const requests = [];
  // var downloadstatus = TRUE;

  const $mainContent = $('.main-content'); // which contains userlist and search functionality
  let username = ''; // variable to store username entered.
  const $usernameInput = $('.usernameInput'); // Input for username
  const $loginPage = $('.login-page'); // the login form area
  const $window = $(window);
  const $homePage = $('.home-page'); // home page
  const $transferPage = $('.transfer-page'); // file transfer page
  const $progressBar = $('.progress_bar'); // prgress bar
  const $chatbox = $('.chat');
  // const $userRequest = $('#user-requests'); // sidebar to accept or deny a connection
  const socket = window.io();
  //   const $testmes = $('#first-message');
  const $alertUsername = $('.alert-username');
  const $alertUsernameBlank = $('.alert-blankusername');
  const $listOfUsers = $('#listOfUsers');
  const $cancelButton = $('#waiting_message .cancel-button button');
  const bitrateDiv = document.getElementById('bitrate');
  const downloadAnchor = document.getElementById('download');
  const statusMessage = document.getElementById('status');

  //   const bitrateMax = 0;
  //   const TURN_SERVER_IP = '127.0.0.1';
  let offersForMe = [];
  const configuration = {
    // Needed for RTCPeerConnection
    iceServers: [
      {
        urls: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com',
      },
    ],
  };
  let client;
  let ExchangerUsername; // variable for name of requested username
  //   let offerComplete = false;
  let fileRec;
  let file;
  let sender = false; // to maintain state of the client(whether he/she is a sender or a receiver)

  // message
  const chats = document.getElementById('chats');
  const message = document.getElementById('btn-input');
  const sendButton = document.getElementById('btn-chat');
  const typing = document.getElementById('typing');

  function cleanInput(input) {
    // Prevents input from having injected marku
    return $('<div/>').text(input).text();
  }

  function cancelConnection() {
    offersForMe = [];
    socket.partner = null;
    socket.partnerid = null;

    console.log('Connection terminated');
    $transferPage.fadeOut();
    $progressBar.fadeOut();
    $homePage.show();
    ExchangerUsername = null;
    // offerComplete = false;
    sender = false;
    client.destroy();
    // Clear the requests
    $('.request-list').html('');
  }

  function requestHandler(answer, btn) {
    const requestingUsername = btn.parent().parent()[0].textContent;
    if (answer === 'y') {
      socket.partner = requestingUsername;
      socket.partnerid = offersForMe[requestingUsername];
      console.log(`${socket.partner} ${socket.partnerid}`);
      //    if request accepted
      ExchangerUsername = requestingUsername;
      // Set data-channel response on the other end(the client who receives the offer)
      $homePage.hide();
      $transferPage.fadeIn();
      const $transferPageHeader = $('.user-name');
      $transferPageHeader.html(`<p>You are now connected to ${socket.partner}. To go back click <a href="#" class="alert-link" id="backLink"> here </a>. </p>`);
    } else {
      //    if request rejected
      btn.parent().parent().remove();
    }
    socket.emit('answer', {
      username: requestingUsername,
      answer,
    });

    // emit an event to the requesting user
  }

  function getClient() {
    client = new WebTorrent({
      tracker: { rtcConfig: configuration },
    });
    client.on('error', (err) => { alert(err); });
    client.on('warning', (w) => { alert(w); });
  }

  function sendData() {
    $('#fileBeingSent').text(`${file.name} ( ${Math.round(file.size / 1000)}  KB)`);

    getClient();
    const torrent = client.seed(file, () => {});

    torrent.on('infoHash', () => {
      console.log(torrent.magnetURI);
      socket.emit('send', {
        user: ExchangerUsername,
        hash: torrent.magnetURI,
      });
    });
  }

  $('#download').hide();

  $('window.onbeforeunload').click((e) => {
    e.preventDefault();
  });

  $('#container div canvas').hide();

  $('#backLink').click(() => {
  });

  $window.keydown((event) => {
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      event.preventDefault();
      username = cleanInput($usernameInput.val().trim()); // trim is to remove extra blank spaces
      $('#welcomeLine').html(`Welcome ${username} !`);

      socket.emit('login', username); // This sends a request to login with certain username

      socket.on('login', (status) => {
        if (status === 2) {
          $usernameInput.val('');
          $alertUsernameBlank.fadeIn(300).delay(2000).fadeOut(300);
        } else if (status === 1) {
          $usernameInput.val('');
          $alertUsername.fadeIn(300).delay(2000).fadeOut(300);
        } else {
          $loginPage.hide();
          $mainContent.fadeIn();
          $progressBar.hide();
          $loginPage.off('click');
        }
      });
    }
  });

  $('#file-1').change(() => {
    const input = document.getElementById('file-1');
    [file] = input.files;
    $('#file-desc').text(file.name);
  });

  $('#file-send-button').click(() => {
    console.log(`${username} sending message`);
    const input = document.getElementById('file-1');
    if (!input) {
      console.log("Um, couldn't find the fileinput element.");
      return;
    } else if (!input.files) {
      console.log("This browser doesn't seem to support the `files` property of file inputs.");
      return;
    } else if (!input.files[0]) {
      console.log("Please select a file before clicking 'Load'");
      return;
    }
    [file] = input.files;

    console.log(`File is ${[file.name, file.size, file.type, file.lastModifiedDate].join(' ')}`);
    statusMessage.textContent = '';
    downloadAnchor.textContent = '';
    if (file == null) console.log('No file selected');
    if (file.size === 0) {
      bitrateDiv.innerHTML = '';
      statusMessage.textContent = 'File is empty, please select a non-empty file';
      console.log('File is empty, please select a non-empty file');
      // closeDataChannels();
      return;
    }
    sender = true;
    socket.emit('file-desc', {
      target: ExchangerUsername,
      fileData: {
        size: file.size,
        name: file.name,
        type: file.type,
        lastModifiedDate: file.lastModifiedDate,
      },
    });
  });

  $(document).on('click', '.online-user', function clickList() {
    // code for what happens when user clicks on a list item of online_users
    const targetUsername = $(this).text();
    socket.emit('offer', targetUsername);
    $('#waiting_message').find('.modal-body').html(`<h3>Waiting for confirmation from ${targetUsername}</h3>`);
    ExchangerUsername = targetUsername;// all this is from the one who sends request to other

    $cancelButton.on('click', () => {
      socket.emit('cancel', targetUsername);
    });
  });


  $(document).on('click', '.user-name a', () => {
    //   cancel the for both users
    console.log('Connection terminated');
    socket.emit('Cancel Connection', ExchangerUsername);
    cancelConnection();
  });

  $(document).on('click', '#user-requests .btn-success', function requestHandle() {
    // code for what happens when user clicks on a list item that is a yes to a particular request
    requestHandler('y', $(this));
  });

  $(document).on('click', '#user-requests .btn-danger', function requestHandle() {
    // code for what happens when user clicks on a list item that is a no to a particular request
    requestHandler('n', $(this));
  });

  $('#stop-progress').click(() => {
    client.destroy();
    sender = false;
    $('#file-send-button').prop('disabled', false);
    $('#fileProgress').text('Cancelled');
    socket.emit('reject', ExchangerUsername);
  });

  // messages
  sendButton.addEventListener('click', () => {
    if (message.value) {
    //   const messagetime = new Date().getTime() / 1000;
      socket.emit('message', {
        message: message.value, socket: socket.partnerid, username, time: message,
      });
      chats.innerHTML += `${"<li class='right clearfix'><span class='chat-img pull-right'><img src='/images/ME.png' alt='User Avatar' class='img-circle' /></span><div class='chat-body clearfix'><div class='header'><small class=' text-muted'><span class='glyphicon glyphicon-time'></span><span class = 'time'>0</span><span class= 'timeunit'> mins</sapn> ago</small><strong class='pull-right primary-font'> You </strong></div><p>"}${message.value}</p></div></li>`;
      message.value = '';
    }
  });

  message.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) {
      if (message.value) {
        // const messagetime = new Date().getTime() / 1000;
        socket.emit('message', {
          message: message.value, socket: socket.partnerid, username, time: message,
        });
        chats.innerHTML += `${"<li class='right clearfix'><span class='chat-img pull-right'><img src='/images/ME.png' alt='User Avatar' class='img-circle' /></span><div class='chat-body clearfix'><div class='header'><small class=' text-muted'><span class='glyphicon glyphicon-time'></span><span class = 'time'>0</span><span class = 'timeunit'> mins</span> ago</small><strong class='pull-right primary-font'> You </strong></div><p>"}${message.value}</p></div></li>`;
        message.value = '';
      }
    }
  });

  message.addEventListener('keydown', () => {
    socket.emit('typing', { socket: socket.partnerid, username });
  });


  socket.on('offer', (data) => {
    console.log(`My Username is ${username}`);

    offersForMe[data.username] = data.pid;
    // show that username wants to connect to you
    const requestList = $('.request-list');

    // create a new list element and prepend it to the existing list
    let newRequest = `<li id="request-li">${data.username}`;
    newRequest += '<span class="request-btn">';
    newRequest += '<a class="btn btn-success" href="#"><i class="fa fa-check" aria-hidden="true"></i></a>';
    newRequest += '<a class="btn btn-danger" href="#"><i class="fa fa-times" aria-hidden="true"></i></a>';
    newRequest += '</span></li>';

    $(newRequest).prependTo(requestList);
  });

  socket.on('updateUsersList', (onlineUsers) => {
    let html = '';
    for (let i = 0; i < onlineUsers.length; i += 1) {
      if (onlineUsers[i] !== username) {
        html += `<div class="user"><button type="button" class="btn btn-default btn-block online-user" data-toggle="modal" data-target="#waiting_message">${onlineUsers[i]}</button> </div>`;
      }
    }
    $listOfUsers.html(html);
  });

  socket.on('answer', (msg) => {
    $('#waiting_message').modal('hide');

    const { answer } = msg;
    if (answer === 'y') {
      socket.partner = msg.partner;
      socket.partnerid = msg.partnerid;

      // stop the progress loader
      $homePage.hide();
      $transferPage.fadeIn();
      const $transferPageHeader = $('.user-name');
      $transferPageHeader.html(`<p>You are now connected to ${socket.partner}${$transferPageHeader.html()}</p>`);
    } else {
      // remove modal after informing partner has said no
      ExchangerUsername = null; // else set ExchangeUsername to None
    }
  });

  socket.on('file-desc', (fileDesc) => {
    console.log('file-desc received');
    if (!sender) { // to make sure we have not already sent a file offer to the other client
      // (we will disable the send button on other side to make sure only one person
      // sends a file at a time, but just to be sure)
      console.log(`File is ${[fileDesc.name, fileDesc.size, fileDesc.type, fileDesc.lastModifiedDate].join(' ')}`);
      fileRec = {
        name: fileDesc.name,
        size: fileDesc.size,
        type: fileDesc.type,
        lastModifiedDate: fileDesc.lastModifiedDate,
      };
      console.log(`file offer of ${fileRec.name} accepted`);
      socket.emit('file accepted', {
        target: ExchangerUsername,
        from: username,
        file: fileDesc.name,
      }); // can put a feature later to ask the user whether
      // he/she wants to accept the file, and based on that respond as accepted/refused
      $('#file-send-button').prop('disabled', true);
      $('#fileBeingSent').text(`${fileRec.name}(${Math.round(fileRec.size / 1000)} KB) (receiving..)`);
    } else {
      sender = false; // if both have sent at the same time, cancel both
      console.log('file refused');
      socket.emit('file refused', ExchangerUsername);
    }
    console.log('end');
  });

  socket.on('file refused', () => {
    sender = false;
  });


  socket.on('file accepted', (data) => { // This is for sender's end. Here funtion gets the username of the user he will now send the file to
    // here's the sendData!
    console.log('trying to send');
    $progressBar.fadeIn();
    sendData(); // start sending :)))
    console.log('send completed');
    socket.emit('status', data);// want to tell the user that has sent the file that file has been sent. Here can add more info to put in file shar history
    const filehistory = `<li class = 'chatbox-file-history-sent'>  You sent ${data.file} to ${data.target}.  </li>`;
    $(filehistory).prependTo($chatbox);// delivering file history to chat box of the sender
  });

  socket.on('status', (data) => { // this should fade out the progress bar after file seding is complete (this is only for reciver side)
    $progressBar.fadeOut();
    console.log(`${data.target}sent${data.file}to${data.from}`);
    // class of the chat/file share history ul is chat
    const filehistory = `<li class = 'chatbox-file-history-recieved'>  You recieved  ${data.file} from ${data.from}. </li>`;
    $(filehistory).prependTo($chatbox);// delivering file history to chat box
  });

  socket.on('send', (hash) => {
    getClient();
    console.log(hash);
    client.add(hash, (torrent) => {
      console.log(hash);
      torrent.on('error', (err) => { alert(err); });

      torrent.on('download', () => {
        $progressBar.fadeIn();
        const progress = torrent.progress * 100;
        $('#file1').attr('aria-valuenow', progress).css('width', `${progress}%`);
        $('#fileProgress').text(`Progress- ${Math.round(progress)}%`);

        socket.emit('progress', {
          user: ExchangerUsername,
          prog: progress,
        });
      });

      torrent.on('done', () => {
        [file] = torrent.files;

        file.getBlobURL((error, url) => {
          if (error) {alert(error);return};
          console.log("file is here");
          downloadAnchor.href = url;
          downloadAnchor.download = file.name;
          downloadAnchor.textContent = `Download ${file.name}`;
          $('#download').show();

          client.destroy();
        });
      });
    });
  });

  socket.on('progress', (progress) => {
    $progressBar.fadeIn();
    $('#stop-progress').html('Cancel');
    $('#file1').attr('aria-valuenow', progress).css('width', `${progress}%`);
    $('#fileProgress').text(`Progress- ${Math.round(progress)}%`);
    if (progress === 100) { client.destroy(); }
  });

  socket.on('reject', () => {
    client.destroy();
    $('#fileProgress').text('Cancelled');
    sender = false;
    $('#file-send-button').prop('disabled', false);
  });

  socket.on('PartnerDisconnected', () => {
    // stop transfer or show dialog that partner has been disconnected retry from main page
    console.log('Partner disconnected');
    alert('Your partner has disconnected');
    cancelConnection();
  });

  socket.on('Cancel Connection', () => {
    cancelConnection();
  });

  socket.on('cancel', (dat) => {
    console.log(dat);
    let html = '';
    const $requestList = $('.request-list');
    for (let i = 0; i < dat.length; i += 1) {
      html += `<li>${dat[i]}<span class="request-btn"> <a class="btn btn-success" href="#"><i class="fa fa-check" aria-hidden="true"></i></a> <a class="btn btn-danger" href="#"><i class="fa fa-times" aria-hidden="true"></i></a> </span></li>`;
    }
    $requestList.html(html);
  });


  socket.on('message', (msg) => {
    chats.innerHTML += `<li class='left clearfix'><span class='chat-img pull-left'><img src='/images/U.png' alt='User Avatar' class='img-circle' /></span><div class='chat-body clearfix'><div class='header'><small class=' text-muted' id = '${message.time}'><span class='glyphicon glyphicon-time'></span><span class = 'time'>0</span><span class= 'timeunit'> mins</sapn> ago</small><strong class='pull-left primary-font'>${msg.username}</strong></div><p>${msg.message}</p></div></li>`;
  });


  socket.on('typing', (localUsername) => {
    typing.innerHTML = `${localUsername} is typing...`;
    setTimeout(() => { typing.innerHTML = ''; }, 5000);
  });

  // time Updation
  setInterval(() => {
    const time = document.getElementsByClassName('time');
    const l = time.length;
    for (let i = 0; i < l; i += 1) {
      const c = time[i].innerHTML;
      time[i].innerHTML = (parseInt(c, 10) + 1);
    }
  }, 60000);
});
