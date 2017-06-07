$(function() {

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
        $listOfUsers = $('#listOfUsers');

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

    // Prevents input from having injected markup
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
    //     }
    // }

    $window.keydown(function(event) {
        // When the client hits ENTER on their keyboard

        if (event.which === 13) {
            event.preventDefault();
            username = cleanInput($usernameInput.val().trim()); // trim is to remove extra blank spaces

            socket.emit('login', username); //This sends a request to login with certain username

            socket.on('login', function(result) {

                if (!result) {
                    $usernameInput.val("");
                    $alertUsername.show();
                    // setUsername();
                } else {
                    $loginPage.hide();
                    $mainContent.fadeIn();
                    $loginPage.off('click');
                }
            });
        }
    });
    socket.on('updateUsersList', function(online_users) {
        var html = '';
        if (online_users.length === 1) {
            //show that no users are online
            // should not be clickable.
        }

        for (var i = 0; i < online_users.length; i++) {
            if (online_users[i] === username) {
                continue;
            }
            html += '<div class="user"><button type="button" class="btn btn-default btn-block online-user" data-toggle="modal" data-target="#waiting_message">' + online_users[i] + '</button> </div>';
        }
        $listOfUsers.html(html);
    });

    $(document).on('click', '.online-user', function() {
        // code for what happens when user clicks on a list item
        var target_username = $(this).text();
        // console.log(target_username);
        socket.emit('offer', target_username);

    });


    var configuration = { //Needed for RTCPeerConnection
        'iceServers': [{
            'url': 'stun:stun.example.org'
        }]
    };

    var pc; //variable to store the RTCPeerConnection object
    var ExchangerUsername; //variable for name of requested username

    // call start() to initiate peer connection process(should be called once 'Y' answer has been received (or sent))

    function start() {
        myPeerConn = new RTCPeerConnection(configuration);

        // send any ice candidates to the other peer
        myPeerConn.onicecandidate = function(evt) {
            if (evt.candidate)
                socket.emit("candidate", {
                    username: ExchangerUsername,
                    candidate: evt.candidate
                });
        };
    }

    function sendLocalDesc() { //send local description to ExchangerUsername
        myPeerConn.createOffer().then(function(offer) {
            return myPeerConnection.setLocalDescription(offer);
        })
            .then(function() {
                socket.emit("session-desc", {
                    target: ExchangerUsername,
                    type: "file-stream", //not sure what should go here
                    sdp: myPeerConnection.localDescription
                });
            })
            .catch(function(reason) {
                // An error occurred, so handle the failure to connect
            });
    }

    // call SendOffer when any username is clicked and
    // also in the meantime show the screen that
    // waiting for permission of user
    // page_number=1

    // save name of requested user as ExhangerUsername

    function SendOffer(user) {
        socket.emit("offer", user);
        ExchangerUsername = user
    }

    function requestHandler(answer, btn) {
        // console.log(btn.parent().parent()[0].textContent);
        // console.log('You have selected : ' + answer);
        var requestingUsername = btn.parent().parent()[0].textContent;
        socket.emit('answer', {
            'username': requestingUsername,
            'answer': answer
        });
        if (answer === 'y') {
            //    if request accepted
            $homePage.hide();
            $transferPage.fadeIn();

        } else {
            //    if request rejected
            btn.parent().parent().remove();
        }

        // emit an event to the requesting user

    }

    $(document).on('click', '#user-requests .btn-success', function() {
        // code for what happens when user clicks on a list item
        requestHandler('y', $(this));
    });
    $(document).on('click', '#user-requests .btn-danger', function() {
        // code for what happens when user clicks on a list item
        requestHandler('n', $(this));
    });

    socket.on("offer", function(username) {

        // console.log('Offer Sent by ' + username);

        // show that username wants to connect to you
        var requestList = $('.request-list');

        // create a new list element and prepend it to the existing list
        var newRequest = '<li>' + username;
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
        //CHANGE THAT MODAL'S CSS DISPLAY ATTRIBUTE FROM HIDDEN TO BLOCK OR SOMETHING
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
            // start(); //start the peerconnection process
            // sendLocalDesc(); //create peer connection offer and send local description on other side
        } else {

            //remove modal after informing partner has said no
            ExchangerUsername = null; // else set ExchangeUsername to None
        }
    });

    socket.on("session-desc", function(message) {
        myPeerConn.setRemoteDescription(message.sdp).then(function() {
            if (myPeerConn.remoteDescription.type === 'offer') {
                myPeerConn.createAnswer().then(function(answer) {
                    return myPeerConn.setLocalDescription(answer);
                })
                    .then(function() {
                        socket.emit("session-desc", {
                            target: ExchangerUsername,
                            type: "file-stream",
                            sdp: myPeerConnection.localDescription
                        });
                    })
                    .catch(function(reason) {
                        // An error occurred, so handle the failure to connect
                    });
            }
        })
    });

    socket.on("candidate", function(candidate) {
        myPeerConn.addIceCandidate(candidate) //add remote icecandidate
            .then(function() {
                console.log('AddIceCandidate success.');
            })
            .catch(function() {
                console.log('Error in adding IceCandidate');
            });
    });

    socket.on("PartnerDisconnected", function() {
        //stop transfer or show dialog that partner has been disconnected retry from main page

    });


});
