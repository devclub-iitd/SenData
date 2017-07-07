$(function() {
    //alert("started");
    // implementing username form in a different way like socket.io
    var $mainContent = $('.main-content'), // which contains userlist and search functionality
        username = '', // variable to store username entered.
        $usernameInput = $('.usernameInput'), // Input for username
        $loginPage = $('.login-page'), // the login form area
        $window = $(window),
        $homePage = $('.home-page'), // home page
        $transferPage = $('.transfer-page'), // file transfer page
        $userRequest = $('#user-requests'), // sidebar to accept or deny a connection
        socket = io(),
        $alertUsername = $('.alert-username'),
        $alertUsername_blank = $('.alert-blankusername'),
        $listOfUsers = $('#listOfUsers'),
        $cancelButton = $('#waiting_message .cancel-button button');

    //var fileInput=$('#file-1'),
    var bitrateDiv = document.getElementById('bitrate'),
        downloadAnchor = document.getElementById('download'),
        statusMessage = document.getElementById('status'),
        //progress=document.getElementById('file1'),
        bitrateMax = 0;

    var TURN_SERVER_IP = '10.249.211.250'

    var offers_for_me = [];
    // alert("Running");

    /*
     page_number

     case:0      page showing online user_names
     case:1      page/popup showing waiting for permission
     (other buttons should not be accesible during this time)
     case:2      page of send


     */
    //var app = require('express')();
    //var io = require('socket.io')(http);

    // window.onbeforeunload = function (event) {
    //     event.preventDefault();
    //     alert("Do not refresh. You will get disconnected.");
    // };

    $('window.onbeforeunload').click(function(e){
        e.preventDefault();
        // Code goes here
    });

    // Prevents input from having injected marku
    function cleanInput(input) {
        return $('<div/>').text(input).text();
    }

    // function setUsername() {
    //     username = cleanInput($usernameInput.val().trim()); // trim is to remove extra blank spaces
    //     // If the username is valid
    //     if (username) {
    //         // console.log(username);
    //         $loginPage.hide();
    //         $mainContent.fadeIn(100);
    //         $loginPage.off('click');        // to remove the click event handler
    //     }s
    // }

    $window.keydown(function(event) {
        // When the client hits ENTER on their keyboard

        if (event.which === 13) {
            event.preventDefault();
            username = cleanInput($usernameInput.val().trim()); // trim is to remove extra blank spaces
            // console.log(username);
            $('#welcomeLine').html('Welcome ' + username + ' !');

            socket.emit('login', username); //This sends a request to login with certain username

            socket.on('login', function(status) {

                if (status == 2) {
                    $usernameInput.val("");
                    $alertUsername_blank.fadeIn( 300 ).delay( 2000 ).fadeOut( 300 );
                    // setUsername();
                }
                else if (status == 1) {
                    $usernameInput.val("");
                    $alertUsername.fadeIn( 300 ).delay( 2000 ).fadeOut( 300 );
                }
                else {
                    $loginPage.hide();
                    $mainContent.fadeIn();
                    $loginPage.off('click');
                }
            });
        }
    });
    socket.on('updateUsersList', function(online_users) {
        var html = '';
        // if (online_users.length === 1) {
        //     html += '<p style="color: #ddd;">No users are online</p>';
        //     //show that no users are online
        //     // should not be clickable.
        // }

        for (var i = 0; i < online_users.length; i++) {
            console.log(online_users[i] + " " + username);
            if (online_users[i] === username) {
                console.log("continuing");
                continue;
            } else {
                html += '<div class="user"><button type="button" class="btn btn-default btn-block online-user" data-toggle="modal" data-target="#waiting_message">' + online_users[i] + '</button> </div>';

            }
        }
        $listOfUsers.html(html);
    });


    $(document).on('click', '.online-user', function() {
        // code for what happens when user clicks on a list item
        var target_username = $(this).text();
        // console.log(target_username);
        socket.emit('offer', target_username);
        $('#waiting_message').find('.modal-body').html('<h3>Waiting for confirmation from ' + target_username + '</h3>');
        ExchangerUsername = target_username;

        $cancelButton.on('click', function() {
            socket.emit('cancel', target_username);
        });
    });

    $(document).on('click', '.user-name a', function() {
        //   cancel the connection for both users
        $transferPage.hide();
        $homePage.show();
    });
	
	$('#file-1').change(function(){
		input = document.getElementById('file-1');
		file=input.files[0];
		$('#file-desc').text(file.name);
	});
	
    var configuration = { //Needed for RTCPeerConnection
        'iceServers': [
            /*{
             'urls': 'stun:stun.l.google.com:19302'
             },
             */
            {
                urls: 'stun:' + TURN_SERVER_IP + ':3478',
                credentials: 'test',
                username: 'test'
            }
        ]
    };
    var connection = {
        'optional': [{
            'DtlsSrtpKeyAgreement': true
        }, {
            'SctpDataChannels': true
        }]
    };
    var myPeerConn; //variable to store the RTCPeerConnection object
    var ExchangerUsername; //variable for name of requested username
    var dataChannel;
    var offerComplete = false;
    var file_rec;
    var file;
    var sender = false; //to maintain state of the client(whether he/she is a sender or a receiver)
    var receiveBuffer = [];
    var receivedSize = 0;
    var receivedProgress = {
        value: 0
    };
    var sendProgress = {
        value: 0
    };
    var newprogress = 0;
    var prevprogress = 0;
    // call start() to initiate peer connection process(should be called once 'Y' answer has been received (or sent))

    function start() {
        myPeerConn = new RTCPeerConnection(configuration) //, connection);


        // send any ice candidates to the other peer
        myPeerConn.onicecandidate = function(evt) {
            if (evt.candidate) {
                socket.emit("candidate", {
                    username: ExchangerUsername,
                    candidate: evt.candidate
                });
            }
        };
    }

    function sendLocalDesc() { //send local description to ExchangerUsername
        //Create data channel and set event handling(the one who sends offer does this)
        dataChannel = myPeerConn.createDataChannel("datachannel");


        dataChannel.onmessage = onReceiveMessageCallback;

        dataChannel.onopen = function() {
            console.log("------ DATACHANNEL OPENED ------");
        };
        dataChannel.onclose = function() {
            console.log("------- DC closed! -------");
        };
        dataChannel.onerror = function() {
            console.log("DC ERROR!!!");
        };
        console.log("TRYING TO CREATE OFFER");
        var sdpConstraints = {
            'mandatory': {
                'OfferToReceiveAudio': false,
                'OfferToReceiveVideo': false
            }
        };


        myPeerConn.createOffer(sdpConstraints).then(function(offer) {
            console.log("Trying to get local description from stun servers");
            return myPeerConn.setLocalDescription(offer);
        })
            .then(function() {
                socket.emit("session-desc", {
                    target: ExchangerUsername,
                    type: "file-stream", //not sure what should go here
                    sdp: myPeerConn.localDescription
                });
                console.log("Sending local descriptions to other guy");
            })
            .catch(function(reason) {
                // An error occurred, so handle the failure to connect
                console.log("error occurred");
                console.log(reason);
            });


    }

    function receiveChannelCallback(event) {
        dataChannel = event.channel;
        dataChannel.onmessage = onReceiveMessageCallback; //the function that will push the received data into a buffer
        dataChannel.onopen = function() {
            console.log("------ DATACHANNEL OPENED ------(by other side)");
        };
        dataChannel.onclose = function() {
            console.log("------- DC closed! -------");
        };
        dataChannel.onerror = function() {
            console.log("DC ERROR!!!");
        };
    }
    // call SendOffer when any username is clicked and
    // also in the meantime show the screen that
    // waiting for permission of user
    // page_number=1

    // save name of requested user as ExhangerUsername

    /*function SendOffer(user) {
     socket.emit("offer", user);
     ExchangerUsername = user
     }*/

    function requestHandler(answer, btn) {
        // console.log(btn.parent().parent()[0].textContent);
        // console.log('You have selected : ' + answer);
        var requestingUsername = btn.parent().parent()[0].textContent;
        // console.log("Hey "+requestingUsername);
        if (answer === 'y') {
            socket.partner = requestingUsername;
            socket.partnerid = offers_for_me[requestingUsername];
            console.log(socket.partner + " " + socket.partnerid);
            //    if request accepted
            ExchangerUsername = requestingUsername;
            start();
            //Set datachannel response on the other end(the client who receives the offer)
            myPeerConn.ondatachannel = receiveChannelCallback;
            $homePage.hide();
            $transferPage.fadeIn();
            var $transferPageHeader = $('.user-name');
            $transferPageHeader.html('<p>You are now connected to ' + socket.partner + $transferPageHeader.html() + '</p>');
        } else {
            //    if request rejected
            btn.parent().parent().remove();

        }
        socket.emit('answer', {
            'username': requestingUsername,
            'answer': answer
        });

        // emit an event to the requesting user

    }

    function onReceiveMessageCallback(event) {
        //console.log('Received Message ' + event.data.size);
        receiveBuffer.push(event.data);
        receivedSize += event.data.size;
        //console.log(receivedSize+" "+file_rec.size);
        receivedProgress.value = receivedSize;
        newprogress = (receivedProgress.value / file_rec.size) * 100;
        $('#file1').attr('aria-valuenow', newprogress).css('width', newprogress + '%');
        if (newprogress > prevprogress + 1) {
            prevprogress = newprogress;
            socket.emit("received-chunks", {
                username: ExchangerUsername,
                progress: newprogress
            });
        }
        if (receivedSize === file_rec.size) {
            console.log("RECEIVED ENTIRE FILE");
            var received = new window.Blob(receiveBuffer);
            receiveBuffer = [];
            console.log("converted array to blob");
            downloadAnchor.href = URL.createObjectURL(received);
            console.log(downloadAnchor.href);
            downloadAnchor.download = file_rec.name;
            //console.log(downloadAnchor.download);
            downloadAnchor.textContent = 'Click to download \'' + file_rec.name + '\' (' + file_rec.size + ' bytes)';
            downloadAnchor.style.display = 'block';
            console.log("Download link created");
            //var bitrate = Math.round(receivedSize * 8 /
            //    ((new Date()).getTime() - timestampStart));
            bitrateDiv.innerHTML = '<strong>Average Bitrate:</strong> ' +
                bitrate + ' kbits/sec (max: ' + bitrateMax + ' kbits/sec)';

            //if (statsInterval) {
            //  window.clearInterval(statsInterval);
            //  statsInterval = null;
            //}

            //closeDataChannels();
        }

    }


    function sendData() {
        console.log("Begun sending");
        var chunkSize = 16384;
        var sliceFile = function(offset) {
            var reader = new window.FileReader();
            reader.onload = (function() {
                return function(e) {
                    dataChannel.send(e.target.result);
                    if (file.size > offset + e.target.result.byteLength) {
                        window.setTimeout(sliceFile, 0, offset + chunkSize);
                    } else console.log("entire file sent to data channel");
                    sendProgress.value = offset + e.target.result.byteLength;
                    //newprogress=(sendProgress.value/file.size)*100;
                    //$('#file1').attr('aria-valuenow', newprogress).css('width',newprogress+'%');
                };
            })(file);
            var slice = file.slice(offset, offset + chunkSize);
            reader.readAsArrayBuffer(slice);
        };
        sliceFile(0);

    }



    socket.on("cancel", function(dat) {

      //data.username
      //data.waitingList
      console.log(dat);

        var html = '';
        var $requestList = $('.request-list');
        for (var i = 0; i < dat.length; i++) {
            html += '<li>' + dat[i] + '<span class="request-btn"> <a class="btn btn-success" href="#"><i class="fa fa-check" aria-hidden="true"></i></a> <a class="btn btn-danger" href="#"><i class="fa fa-times" aria-hidden="true"></i></a> </span></li>';
        }
        $requestList.html(html);
    });

    $(document).on('click', '#user-requests .btn-success', function() {
        // code for what happens when user clicks on a list item
        requestHandler('y', $(this));
    });
    $(document).on('click', '#user-requests .btn-danger', function() {
        // code for what happens when user clicks on a list item
        requestHandler('n', $(this));
    });

    $('#file-send-button').click(function() {
        console.log(username + " sending message");
        //file = fileInput.files[0];
        input = document.getElementById('file-1');
        if (!input) {
            console.log("Um, couldn't find the fileinput element.");
            return;
        } else if (!input.files) {
            console.log("This browser doesn't seem to support the `files` property of file inputs.");
            return;
        } else if (!input.files[0]) {
            console.log("Please select a file before clicking 'Load'");
            return;
        } else {
            file = input.files[0];
        }
        console.log('File is ' + [file.name, file.size, file.type, file.lastModifiedDate].join(' '));
        statusMessage.textContent = '';
        downloadAnchor.textContent = '';
        if (file == null) console.log('No file selected');
        if (file.size === 0) {
            bitrateDiv.innerHTML = '';
            statusMessage.textContent = 'File is empty, please select a non-empty file';
            console.log('File is empty, please select a non-empty file');
            //closeDataChannels();
            return;
        }
        sender = true;
        socket.emit("file-desc", {
            target: ExchangerUsername,
            fileData: {
                size: file.size,
                name: file.name,
                type: file.type,
                lastModifiedDate: file.lastModifiedDate
            }
        });
        //dataChannel.close();
    });




    socket.on("offer", function(data) {

        // console.log('Offer Sent by ' + username);
        // username = data.username;
        // pid = data.pid;
        console.log("My Username is " + username);

        offers_for_me[data.username] = data.pid;
        // show that username wants to connect to you
        var requestList = $('.request-list');

        // create a new list element and prepend it to the existing list
        var newRequest = '<li>' + data.username;
        newRequest += '<span class="request-btn">';
        newRequest += '<a class="btn btn-success" href="#"><i class="fa fa-check" aria-hidden="true"></i></a>';
        newRequest += '<a class="btn btn-danger" href="#"><i class="fa fa-times" aria-hidden="true"></i></a>';
        newRequest += '</span></li>';

        $(newRequest).prependTo(requestList);


        // if user accepts the connection show the transfer page
        // $acceptConnection.click(function() {
        //     answer = 'Y';
        //     $homePage.hide();
        //     $transferPage.fadeIn(200);
        //     start();
        //     ExchangerUsername = username;
        //     socket.emit("answer", {
        //         answer: answer,
        //         username: username
        //     });
        // });
        // // else, if user rejects show the homePage
        // $rejectConnection.click(function() {
        //     answer = 'N';
        //     $connectionRequest.fadeOut();
        //     socket.emit("answer", {
        //         answer: answer,
        //         username: username
        //     });
        // });

        // accept or deny
        // append as feed on the side//IE ANOTHER MODAL
        //CHANGE THAT MODALS CSS DISPLAY ATTRIBUTE FROM HIDDEN TO BLOCK OR SOMETHING
    });

    socket.on("answer", function(msg) {

        $('#waiting_message').modal('hide');

        answer = msg.answer;
        // if answer is yes.....goto page_number=2
        // rest code follows.................
        if (answer === "y") {
            socket.partner = msg.partner;
            socket.partnerid = msg.partnerid;

            //stop the progress loader
            $homePage.hide();
            $transferPage.fadeIn();
            var $transferPageHeader = $('.user-name');
            $transferPageHeader.html('<p>You are now connected to ' + socket.partner + $transferPageHeader.html() + '</p>');
            start(); //start the peerconnection process
            sendLocalDesc(); //create peer connection offer and send local description on other side(also create a data channel)

        } else {

            //remove modal after informing partner has said no
            ExchangerUsername = null; // else set ExchangeUsername to None
        }
    });

    socket.on("session-desc", function(message) {
        console.log("session-desc received");
        myPeerConn.setRemoteDescription(message.sdp).then(function() {
            //offerComplete=true;
            console.log("received something");
            if (myPeerConn.remoteDescription.type === 'offer') {
                myPeerConn.createAnswer().then(function(answer) {
                    return myPeerConn.setLocalDescription(answer);
                })
                    .then(function() {
                        socket.emit("session-desc", {
                            target: ExchangerUsername,
                            type: "file-stream",
                            sdp: myPeerConn.localDescription
                        });
                        console.log("Received remote description, now sending my local description");
                        //Set datachannel response on the other end(the client who receives the offer)
                        ////myPeerConn.ondatachannel = receiveChannelCallback;

                    })
                    .catch(function(reason) {
                        // An error occurred, so handle the failure to connect
                    });
            } else {
                console.log("Process complete");
            }
        });
    });

    socket.on("candidate", function(candidate) {
        if (1) { //leave this, might have to put a condition later
            console.log("Received IceCandidate");
            myPeerConn.addIceCandidate(candidate) //add remote icecandidate
                .then(function() {
                    console.log('AddIceCandidate success.');
                })
                .catch(function(reason) {
                    console.log('Error in adding IceCandidate');
                    console.log(reason);
                });
        }
    });

    socket.on("file-desc", function(file_desc) {
        console.log("file-desc received");
        if (!sender) { //to make sure we have not already sent a file offer to the other client
            //(we will disable the send button on other side to make sure only one person
            //sends a file at a time, but just to be sure)
            console.log("ok");
            //console.log(file_desc.name);
            console.log('File is ' + [file_desc.name, file_desc.size, file_desc.type, file_desc.lastModifiedDate].join(' '));
            //file_rec.size=file_desc.size;
            //console.log(file_desc.size);
            //file_rec.name=file_desc.name;	//metadata of the file to be received
            //file_rec.type=file_desc.type;
            //file_rec.lastModifiedDate=file_desc.lastModifiedDate;
            file_rec = {
                name: file_desc.name,
                size: file_desc.size,
                type: file_desc.type,
                lastModifiedDate: file_desc.lastModifiedDate
            };
            console.log("file offer of " + file_rec.name + " accepted");
            socket.emit("file accepted", ExchangerUsername); // can put a feature later to ask the user whether
            // he/she wants to accept the file, and based on that respond as accepted/refused
        } else {
            sender = false; //if both have sent at the same time, cancel both
            console.log("file refused");
            socket.emit("file refused", ExchangerUsername);
        }
    });

    socket.on("file refused", function() {
        sender = false;
    });

    socket.on("file accepted", function() {
        sendData(); //start sending :)))

    });

    socket.on("received-chunks", function(prog) {
        newprogress = prog;
        $('#file1').attr('aria-valuenow', newprogress).css('width', newprogress + '%');
    });
    socket.on("PartnerDisconnected", function() {
        //stop transfer or show dialog that partner has been disconnected retry from main page
        offerComplete = false;
    });


});
