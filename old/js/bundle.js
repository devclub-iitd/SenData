(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
$(() => {
//   const requests = [];
  // var downloadstatus = TRUE;
  const thunky = require('thunky');
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
  const $transferPageHeader = $('.user-name');
  const $alertUsernameBlank = $('.alert-blankusername');
  const $listOfUsers = $('#listOfUsers');
  const $cancelButton = $('#waiting_message .cancel-button button');
  const fileSendButton = $('#file-send-button');
  const bitrateDiv = document.getElementById('bitrate');
  const $downloadAnchor = $('#download');
  const statusMessage = document.getElementById('status');
  $(document).ready(function(){
    $('[data-toggle="tooltip"]').tooltip(); 
  });

  // const TURN_SERVER_IP = env.IP;
  let offersForMe = [];
  const STUN_IP = "vm2-internal.devclub.in";
  const TRACKER_IP = "vm2-internal.devclub.in";
  const configuration = {
    // Needed for RTCPeerConnection
    iceServers: [
      {
        urls: 'stun:'+ STUN_IP +':3478',
      },
    ],
  };
  let ExchangerUsername; // variable for name of requested username
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
    $chatbox.text('');

    // console.log('Connection terminated');
    $transferPage.fadeOut();
    $progressBar.fadeOut();
    $homePage.show();
    $transferPageHeader.html('');
    $downloadAnchor.fadeOut();
    $downloadAnchor.prop('href','');
    statusMessage.textContent = '';
    // Clear the requests
    $('.request-list').html('');

    ExchangerUsername = null;
    // offerComplete = false;
    sender = false;
    if (window.client.torrents.length > 0) {
      window.client.torrents[0].destroy;
    }
  }

  function requestHandler(answer, btn) {
    const requestingUsername = btn.parent().parent()[0].textContent;
    if (answer === 'y') {
      socket.partner = requestingUsername;
      socket.partnerid = offersForMe[requestingUsername];
      // console.log(`${socket.partner} ${socket.partnerid}`);
      //    if request accepted
      ExchangerUsername = requestingUsername;
      // Set data-channel response on the other end(the client who receives the offer)
      $homePage.hide();
      $transferPage.fadeIn();
      $transferPageHeader.html(`<p>You are now connected to ${socket.partner}. To disconnect click <a href="#" class="alert-link" id="backLink" data-toggle ="modal" data-target="#cancel_message"> here </a>. </p>`);
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

  var getClient = thunky(function (cb) {
    var client = new WebTorrent({
      tracker: {
        rtcConfig: configuration
      }
    })
    window.client = client // for easier debugging
    cb(null, client)
  })

  function sendData() {
    $('#fileBeingSent').text(`${file.name} ( ${Math.round(file.size / 1000)}  KB)`);

    getClient(function(err,client){
      client.seed(file, { announce: ['ws://'+TRACKER_IP+':8000']}, (torrent) => {
      
        torrent.on('upload',()=>{});
  
        socket.emit('send', {
          target: ExchangerUsername,
          fileData: {
            size: file.size,
            name: file.name,
            type: file.type,
            lastModifiedDate: file.lastModifiedDate,
          },
          hash: torrent.magnetURI,
        });
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

  fileSendButton.click(() => {
    // console.log(`${username} sending message`);
    const input = document.getElementById('file-1');
    if (!input) {
      alert("Um, couldn't find the fileinput element.");
      return;
    } else if (!input.files) {
      alert("This browser doesn't seem to support the `files` property of file inputs.");
      return;
    } else if (!input.files[0]) {
      alert("Please select a file before clicking 'Load'");
      return;
    }

    const fileStatus = `<li class = 'chatbox-file-history-sent'>  Sending  ${file.name} to ${ExchangerUsername}. </li>`;
    $(fileStatus).appendTo($chatbox);

    statusMessage.textContent = '';
    $('#file1').attr('aria-valuenow', 0).css('width', '0%');
    $downloadAnchor.fadeOut();

    if (file == null) alert('No file selected');
    if (file.size === 0) {
      bitrateDiv.innerHTML = '';
      statusMessage.textContent = 'File is empty, please select a non-empty file';
      alert('File is empty, please select a non-empty file');
      // closeDataChannels();
      return;
    }
    
    sender = true;
    sendData();
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


  $(document).on('click', '.cancel-modal', () => {
    //   cancel the for both users
    // console.log('Connection terminated');
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
  	window.client.torrents[0].destroy();
    sender = false;
    fileSendButton.prop('disabled', false);

    socket.emit('reject', ExchangerUsername);
    $('#fileProgress').text('Cancelled');

    const fileStatus = '<li class = \'chatbox-file-history-cancel\'>  You cancelled file transfer. </li>';
    $(fileStatus).appendTo($chatbox);
  });

  // messages
  sendButton.addEventListener('click', () => {
    if (message.value) {
    //   const messagetime = new Date().getTime() / 1000;
      socket.emit('message', {
        message: message.value, socket: socket.partnerid, username, time: message,
      });
      chats.innerHTML += `${"<li class='right clearfix'><span class='chat-img pull-right'><img src='/images/ME.png' alt='User Avatar' class='img-circle' /></span><div class='chat-body clearfix'><div class='header'><small class=' text-muted'><span class='glyphicon glyphicon-time'></span><span class = 'time'>0</span><span class= 'timeunit'> mins</sapn> ago</small><strong class='pull-right primary-font'> You </strong></div><p class='chat_text_message'>"}${message.value}</p></div></li>`;
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
        chats.innerHTML += `${"<li class='right clearfix'><span class='chat-img pull-right'><img src='/images/ME.png' alt='User Avatar' class='img-circle' /></span><div class='chat-body clearfix'><div class='header'><small class=' text-muted'><span class='glyphicon glyphicon-time'></span><span class = 'time'>0</span><span class = 'timeunit'> mins</span> ago</small><strong class='pull-right primary-font'> You </strong></div><p class='chat_text_user'>"}${message.value}</p></div></li>`;
        message.value = '';
      }
    }
  });

  message.addEventListener('keydown', () => {
    socket.emit('typing', { socket: socket.partnerid, username });
  });


  socket.on('offer', (data) => {
    // console.log(`My Username is ${username}`);

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

      socket.emit('ack', msg);
      // stop the progress loader
      $homePage.hide();
      $transferPage.fadeIn();
      const $transferPageHeader = $('.user-name');
      $transferPageHeader.html(`<p>You are now connected to ${socket.partner}. To disconnect click <a href="#" class="alert-link" id="backLink" data-toggle ="modal" data-target="#cancel_message"> here </a>. </p>`);
    } else {
      // remove modal after informing partner has said no
      ExchangerUsername = null; // else set ExchangeUsername to None
    }
  });

  socket.on('send', (data) => {
    fileDesc = data.fileData;

    fileSendButton.prop('disabled', true);
    $('#file1').attr('aria-valuenow', 0).css('width', '0%');
    $('#fileBeingSent').text(`${fileDesc.name}(${Math.round(fileDesc.size / 1000)} KB) (receiving..)`);
    const fileStatus = `<li class = 'chatbox-file-history-recieved'>  Receiving  ${fileDesc.name} from ${ExchangerUsername}. </li>`;
    $(fileStatus).appendTo($chatbox);

    $progressBar.fadeIn();
    $('#stop-progress').html('Cancel');
    $('#fileProgress').text('Establishing Connection');
    
    hash = data.hash;

    getClient(function(err,client){
      client.add(hash, { announce: ['ws://'+TRACKER_IP+':8000']}, (torrent) => {
        torrent.on('error', (err) => { alert(err); });

        function update(){
          const progress = torrent.progress * 100;
          $('#file1').attr('aria-valuenow', progress).css('width', `${progress}%`);
          $('#fileProgress').text(`Progress- ${Math.round(progress)}%`);
          socket.emit('progress',{
            partner: ExchangerUsername,
            progress: progress,
          });
        }

        torrent.on('download', update);
        setInterval(update, 2000);

        torrent.on('done', () => {
           
          [file] = torrent.files;
          $progressBar.fadeOut();

        // class of the chat/file share history ul is chat
          const filehistory = `<li class = 'chatbox-file-history-recieved'>  You recieved  ${file.name} from ${ExchangerUsername}. </li>`;
          $(filehistory).appendTo($chatbox);// delivering file history to chat box

          file.getBlobURL((error, url) => {
            if (error) { alert(error); return; }
            // console.log("file is here");
            $downloadAnchor.prop('href', url);
            $downloadAnchor.prop('download', file.name);
            $('#status').text(`This contains download link for ${file.name}`);
            $('#download').show();

            fileSendButton.prop('disabled', false);
          });
        });
      });
    });
  });

  socket.on('progress', (progress) => {
    $progressBar.fadeIn();
    $('#file1').attr('aria-valuenow', progress).css('width', `${progress}%`);
    $('#fileProgress').text(`Progress- ${Math.round(progress)}%`);

    if (progress === 100) {
      if (window.client.torrents.length > 0) {
        window.client.torrents[0].destroy;
        sender = false;
        console.log("wn");
        $progressBar.fadeOut();
        const filehistory = `<li class = 'chatbox-file-history-sent'>  You sent ${file.name} to ${ExchangerUsername}.  </li>`;
        $(filehistory).appendTo($chatbox);// delivering file history to chat box of the sender
        fileSendButton.prop('disabled', false);//Activating the send button on the sender's side
      }
    }
  });

  socket.on('reject', () => {
  	window.client.torrents[0].destroy();

    $('#fileProgress').text('Cancelled');

    const fileStatus = `<li class = 'chatbox-file-history-cancel'>  Transfer cancelled by ${ExchangerUsername}. </li>`;
    $(fileStatus).appendTo($chatbox);

    sender = false;
    fileSendButton.prop('disabled', false);
  });

  socket.on('PartnerDisconnected', () => {
    // stop transfer or show dialog that partner has been disconnected retry from main page
    // console.log('Partner disconnected');
    alert('Your partner has disconnected');
    cancelConnection();
  });

  socket.on('Cancel Connection', () => {
    cancelConnection();
  });

  socket.on('cancel', (dat) => {
    // console.log(dat);
    let html = '';
    const $requestList = $('.request-list');
    for (let i = 0; i < dat.length; i += 1) {
      html += `<li>${dat[i]}<span class="request-btn"> <a class="btn btn-success" href="#"><i class="fa fa-check" aria-hidden="true"></i></a> <a class="btn btn-danger" href="#"><i class="fa fa-times" aria-hidden="true"></i></a> </span></li>`;
    }
    $requestList.html(html);
  });


  socket.on('message', (msg) => {
    chats.innerHTML += `<li class='left clearfix'><span class='chat-img pull-left'><img src='/images/U.png' alt='User Avatar' class='img-circle' /></span><div class='chat-body clearfix'><div class='header'><small class=' text-muted' id = '${message.time}'><span class='glyphicon glyphicon-time'></span><span class = 'time'>0</span><span class= 'timeunit'> mins</sapn> ago</small><strong class='pull-left primary-font'>${msg.username}</strong></div><p class='chat_text_message'>${msg.message}</p></div></li>`;
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
},{"thunky":3}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
(function (process){
'use strict'

var nextTick = nextTickArgs
process.nextTick(upgrade, 42) // pass 42 and see if upgrade is called with it

module.exports = thunky

function thunky (fn) {
  var state = run
  return thunk

  function thunk (callback) {
    state(callback || noop)
  }

  function run (callback) {
    var stack = [callback]
    state = wait
    fn(done)

    function wait (callback) {
      stack.push(callback)
    }

    function done (err) {
      var args = arguments
      state = isError(err) ? run : finished
      while (stack.length) finished(stack.shift())

      function finished (callback) {
        nextTick(apply, callback, args)
      }
    }
  }
}

function isError (err) { // inlined from util so this works in the browser
  return Object.prototype.toString.call(err) === '[object Error]'
}

function noop () {}

function apply (callback, args) {
  callback.apply(null, args)
}

function upgrade (val) {
  if (val === 42) nextTick = process.nextTick
}

function nextTickArgs (fn, a, b) {
  process.nextTick(function () {
    fn(a, b)
  })
}

}).call(this,require('_process'))
},{"_process":2}]},{},[1]);
