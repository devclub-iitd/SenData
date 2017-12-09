$(function () {

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
        $cancelButton = $('#waiting_message .cancel-button button'),
        bitrateDiv = document.getElementById('bitrate'),
        downloadAnchor = document.getElementById('download'),
        statusMessage = document.getElementById('status'),
        bitrateMax = 0,
        TURN_SERVER_IP = '127.0.0.1',
        offers_for_me = [],
        configuration = {
            //Needed for RTCPeerConnection
            'iceServers': [
                {
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                }
            ]
        },
        connection = {
            'optional': [{
                'DtlsSrtpKeyAgreement': true
            }, {
                'SctpDataChannels': true
            }]
        },
        myPeerConn, //variable to store the RTCPeerConnection object,
        ExchangerUsername, //variable for name of requested username
        dataChannel,
        offerComplete = false,
        file_rec,
        file,
        sender = false, //to maintain state of the client(whether he/she is a sender or a receiver)
        receiveBuffer = [],
        receivedSize = 0,
        receivedProgress = {
            value: 0
        },
        sendProgress = {
            value: 0
        },
        newprogress = 0,
        prevprogress = 0;

    $("#download").hide();

    $('window.onbeforeunload').click(function (e) {
        e.preventDefault();
    });

    $("#container div canvas").hide();

    $("#backLink").click(function () {

    });

    $window.keydown(function (event) {
        // When the client hits ENTER on their keyboard
        if (event.which === 13) {
            event.preventDefault();
            username = cleanInput($usernameInput.val().trim()); // trim is to remove extra blank spaces
            $('#welcomeLine').html('Welcome ' + username + ' !');

            socket.emit('login', username); //This sends a request to login with certain username

            socket.on('login', function (status) {

                if (status == 2) {
                    $usernameInput.val("");
                    $alertUsername_blank.fadeIn(300).delay(2000).fadeOut(300);
                } else if (status == 1) {
                    $usernameInput.val("");
                    $alertUsername.fadeIn(300).delay(2000).fadeOut(300);
                } else {
                    $loginPage.hide();
                    $mainContent.fadeIn();
                    $loginPage.off('click');
                }
            });
        }
    });

    $('#file-1').change(function () {
        input = document.getElementById('file-1');
        file = input.files[0];
        $('#file-desc').text(file.name);
    });

    $('#file-send-button').click(function () {
        console.log(username + " sending message");
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
    });

    $(document).on('click', '.online-user', function () {
        // code for what happens when user clicks on a list item
        var target_username = $(this).text();
        socket.emit('offer', target_username);
        $('#waiting_message').find('.modal-body').html('<h3>Waiting for confirmation from ' + target_username + '</h3>');
        ExchangerUsername = target_username;

        $cancelButton.on('click', function () {
            socket.emit('cancel', target_username);
        });
    });

    $(document).on('click', '.user-name a', function () {
        //   cancel the for both users
        console.log("Connection terminated");
        socket.emit("Cancel Connection", ExchangerUsername);
        cancel_connection();
    });

    $(document).on('click', '#user-requests .btn-success', function () {
        // code for what happens when user clicks on a list item
        requestHandler('y', $(this));
    });

    $(document).on('click', '#user-requests .btn-danger', function () {
        // code for what happens when user clicks on a list item
        requestHandler('n', $(this));
    });

    socket.on("offer", function (data) {
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
    });

    socket.on('updateUsersList', function (online_users) {
        var html = '';
        for (var i = 0; i < online_users.length; i++) {
            if (online_users[i] === username) {
                continue;
            } else {
                html += '<div class="user"><button type="button" class="btn btn-default btn-block online-user" data-toggle="modal" data-target="#waiting_message">' + online_users[i] + '</button> </div>';
            }
        }
        $listOfUsers.html(html);
    });

    socket.on("answer", function (msg) {

        $('#waiting_message').modal('hide');

        answer = msg.answer;
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

    socket.on("session-desc", function (message) {
        console.log("session-desc received");
        myPeerConn.setRemoteDescription(message.sdp).then(function () {
            console.log("received something");
            if (myPeerConn.remoteDescription.type === 'offer') {
                myPeerConn.createAnswer().then(function (answer) {
                    return myPeerConn.setLocalDescription(answer);
                })
                    .then(function () {
                        socket.emit("session-desc", {
                            target: ExchangerUsername,
                            type: "file-stream",
                            sdp: myPeerConn.localDescription
                        });
                        console.log("Received remote description, now sending my local description");

                    })
                    .catch(function (reason) {
                        // An error occurred, so handle the failure to connect
                    });
            } else {
                console.log("Process complete");
            }
        });
    });

    socket.on("candidate", function (candidate) {
        console.log("Received IceCandidate");
        myPeerConn.addIceCandidate(candidate) //add remote icecandidate
            .then(function () {
                console.log('AddIceCandidate success.');
            })
            .catch(function (reason) {
                console.log('Error in adding IceCandidate');
                console.log(reason);
            });
    });

    socket.on("file-desc", function (file_desc) {
        console.log("file-desc received");
        if (!sender) { //to make sure we have not already sent a file offer to the other client
            //(we will disable the send button on other side to make sure only one person
            //sends a file at a time, but just to be sure)
            console.log('File is ' + [file_desc.name, file_desc.size, file_desc.type, file_desc.lastModifiedDate].join(' '));
            file_rec = {
                name: file_desc.name,
                size: file_desc.size,
                type: file_desc.type,
                lastModifiedDate: file_desc.lastModifiedDate
            };
            console.log("file offer of " + file_rec.name + " accepted");
            socket.emit("file accepted", ExchangerUsername); // can put a feature later to ask the user whether
            // he/she wants to accept the file, and based on that respond as accepted/refused
            $('#file-send-button').prop('disabled', true);
            $('#fileBeingSent').text(file_rec.name + "(" + Math.round(file_rec.size / 1000) + " KB)");
        } else {
            sender = false; //if both have sent at the same time, cancel both
            console.log("file refused");
            socket.emit("file refused", ExchangerUsername);
        }
        console.log("end")
    });

    socket.on("file refused", function () {
        sender = false;
    });

    socket.on("file accepted", function () {
        //here's the sendData!
        console.log("trying to send")
        sendData(); //start sending :)))
        console.log("send completed")

    });

    socket.on("received-chunks", function (prog) {
        newprogress = prog;
        $('#file1').attr('aria-valuenow', newprogress).css('width', newprogress + '%');
        $("#fileProgress").text("Progress- " + Math.round(newprogress) + "%");
        if (newprogress == 100) {
            $('#file-send-button').prop('disabled', false);
            sender = false;
            receiveBuffer = [];
            receivedSize = 0;
            receivedProgress = {
                value: 0
            };
            sendProgress = {
                value: 0
            };
            newprogress = 0;
            prevprogress = 0;
        }
    });

    socket.on("PartnerDisconnected", function () {
        //stop transfer or show dialog that partner has been disconnected retry from main page
        console.log("Partner disconnected");
        alert("Your partner has disconnected");
        cancel_connection();
    });

    socket.on("Cancel Connection", function () {
        cancel_connection();
    });

    socket.on("cancel", function (dat) {
        console.log(dat);
        var html = '';
        var $requestList = $('.request-list');
        for (var i = 0; i < dat.length; i++) {
            html += '<li>' + dat[i] + '<span class="request-btn"> <a class="btn btn-success" href="#"><i class="fa fa-check" aria-hidden="true"></i></a> <a class="btn btn-danger" href="#"><i class="fa fa-times" aria-hidden="true"></i></a> </span></li>';
        }
        $requestList.html(html);
    });

    function start() {
        // call start() to initiate peer connection process(should be called once 'Y' answer has been received (or sent))
        myPeerConn = new RTCPeerConnection(configuration)
        // send any ice candidates to the other peer
        myPeerConn.onicecandidate = function (evt) {
            if (evt.candidate) {
                socket.emit("candidate", {
                    username: ExchangerUsername,
                    candidate: evt.candidate
                });
            }
        };
    }

    function sendLocalDesc() {
        //send local description to ExchangerUsername
        //Create data channel and set event handling(the one who sends offer does this)
        dataChannel = myPeerConn.createDataChannel("datachannel");
        dataChannel.binaryType = 'arraybuffer';
        dataChannel.onmessage = onReceiveMessageCallback;
        dataChannel.onopen = function () {
            console.log("------ DATACHANNEL OPENED ------");
        };
        dataChannel.onclose = function () {
            console.log("------- DC closed! -------");
        };
        dataChannel.onerror = function () {
            console.log("DC ERROR!!!");
        };
        console.log("TRYING TO CREATE OFFER");
        var sdpConstraints = {
            'mandatory': {
                'OfferToReceiveAudio': false,
                'OfferToReceiveVideo': false
            }
        };

        myPeerConn.createOffer(sdpConstraints).then(function (offer) {
            console.log("Trying to get local description from stun servers");
            return myPeerConn.setLocalDescription(offer);
        })
            .then(function () {
                socket.emit("session-desc", {
                    target: ExchangerUsername,
                    type: "file-stream",
                    sdp: myPeerConn.localDescription
                });
                console.log("Sending local descriptions to other guy");
            })
            .catch(function (reason) {
                // An error occurred, so handle the failure to connect
                console.log("error occurred");
                console.log(reason);
            });
    }

    function cancel_connection() {

        offers_for_me = [];
        socket.partner = null;
        socket.partnerid = null;

        console.log("Connection terminated");
        $transferPage.hide();
        $homePage.show();
        myPeerConn.close();
        dataChannel.close();
        ExchangerUsername = null;
        offerComplete = false;
        sender = false;
        receiveBuffer = [];
        receivedSize = 0;
        receivedProgress = {
            value: 0
        };
        sendProgress = {
            value: 0
        };
        newprogress = 0;
        prevprogress = 0;

        // Clear the requests
        $('.request-list').html("");

    }

    function receiveChannelCallback(event) {
        dataChannel = event.channel;
        dataChannel.binaryType = 'arraybuffer';
        dataChannel.onmessage = onReceiveMessageCallback; //the function that will push the received data into a buffer
        dataChannel.onopen = function () {
            console.log("------ DATACHANNEL OPENED ------(by other side)");
        };
        dataChannel.onclose = function () {
            console.log("------- DC closed! -------");
        };
        dataChannel.onerror = function () {
            console.log("DC ERROR!!!");
        };
    }

    function requestHandler(answer, btn) {
        var requestingUsername = btn.parent().parent()[0].textContent;
        if (answer === 'y') {
            socket.partner = requestingUsername;
            socket.partnerid = offers_for_me[requestingUsername];
            console.log(socket.partner + " " + socket.partnerid);
            //    if request accepted
            ExchangerUsername = requestingUsername;
            start();
            //Set data-channel response on the other end(the client who receives the offer)
            myPeerConn.ondatachannel = receiveChannelCallback;
            $homePage.hide();
            $transferPage.fadeIn();
            var $transferPageHeader = $('.user-name');
            $transferPageHeader.html('<p>You are now connected to ' + socket.partner + '. To go back click <a href="#" class="alert-link" id="backLink"> here </a>. </p>');
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
        receiveBuffer.push(event.data);
        receivedSize += event.data.byteLength;
        receivedProgress.value = receivedSize;
        newprogress = (receivedProgress.value / file_rec.size) * 100;
        $('#file1').attr('aria-valuenow', newprogress).css('width', newprogress + '%');
        $("#fileProgress").text("Progress- " + Math.round(newprogress) + "%");
        if (newprogress > prevprogress + 1) {
            prevprogress = newprogress;
            socket.emit("received-chunks", {
                username: ExchangerUsername,
                progress: newprogress
            });
        }
        if (receivedSize === file_rec.size) {
            console.log("RECEIVED ENTIRE FILE");
            socket.emit("received-chunks", {
                username: ExchangerUsername,
                progress: 100
            });
            $("#fileProgress").text("Progress- " + "100%");
            var received = new window.Blob(receiveBuffer);
            receiveBuffer = [];
            console.log("converted array to blob");
            downloadAnchor.href = URL.createObjectURL(received);
            console.log(downloadAnchor.href);
            downloadAnchor.download = file_rec.name;
            $("#download").show();
            $('#file-send-button').prop('disabled', false);
            sender = false;
            receiveBuffer = [];
            receivedSize = 0;
            receivedProgress = {
                value: 0
            };
            sendProgress = {
                value: 0
            };
            newprogress = 0;
            prevprogress = 0;
            $("#download").trigger('click');
            console.log("Download link created");
        }

    }

    function sendData() {
        console.log("Begun sending");
        $('#fileBeingSent').text(file.name + "(" + Math.round(file.size / 1000) + " KB)");
        var chunkSize = 16384;
        var sliceFile = function (offset) {
            var reader = new window.FileReader();
            reader.onload = (function () {
                return function (e) {
                    dataChannel.send(e.target.result);
                    if (file.size > offset + e.target.result.byteLength) {
                        window.setTimeout(sliceFile, 0, offset + chunkSize);
                    } else console.log("entire file sent to data channel");
                    sendProgress.value = offset + e.target.result.byteLength;
                };
            })(file);
            var slice = file.slice(offset, offset + chunkSize);
            reader.readAsArrayBuffer(slice);
        };
        sliceFile(0);
    }

    function cleanInput(input) {
        // Prevents input from having injected marku
        return $('<div/>').text(input).text();
    }


});
