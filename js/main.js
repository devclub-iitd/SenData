$(function() {

    // implementing username form in a different way like socket.io
    var $mainContent = $('.main-content'); // which contains userlist and search functionality
    var username = ''; // variable to store username entered.
    var $usernameInput = $('.usernameInput'); // Input for username
    var $loginPage = $('.login-page'); // the login form area
    var $window = $(window);
    var $homePage = $('.home-page'); // home page
    var $transferPage = $('.transfer-page'); // file transfer page
    var $connectionRequest = $('#connection_request'); // modal to accept or deny a connection
    var $acceptConnection = $connectionRequest.find('.btn-success'); // accept button in that modal
    var $rejectConnection = $connectionRequest.find('.btn-danger'); // reject button in that modal
    var socket = io();
    var $alertUsername = $('.alert-username');
    var onlineUsers = [];
    var page_number = 0;

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

    function setUsername() {
        username = cleanInput($usernameInput.val().trim()); // trim is to remove extra blank spaces
        // If the username is valid
        if (username) {
            // console.log(username);
            $loginPage.hide();
            $mainContent.show();
            $loginPage.off('click');
        }
    }

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
                    setUsername();
                } else {
                    $loginPage.fadeOut();
                    $mainContent.show();
                    $loginPage.off('click');
                }
            });
        }
    });

    // if user accepts the connection show the transfer page
    $acceptConnection.click(function() {
        $homePage.fadeOut();
        $transferPage.show();
    });
    // else show the homePage
    $rejectConnection.click(function() {
        $connectionRequest.fadeOut();
    });




    var flag = 0;

    socket.on("update list", function(connected_clients) {
        // connected_clients is a dictionary
        // use the keys to update list of user_names
        // if the user is on page_number =0 ;
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

    socket.on("answer", function(answer) {
        // if answer is yes.....goto page_number=2
        // rest code follows.................
        if (answer == "y") {
            start(); //start the peerconnection process
            sendLocalDesc(); //create peer connection offer and send local description on other side
        } else {
            ExchangerUsername = None; // else set ExchangeUsername to None
        }
    });


    socket.on("offer", function(username) {
        // show that username wants to connect to you
        // accept or deny
        // append as feed on the side//IE ANOTHER MODAL
        //CHANGE THAT MODAL'S CSS DISPLAY ATTRIBUTE FROM HIDDEN TO BLOCK OR SOMETHING

        if (answer == "Y") {
            start();
            ExchangerUsername = username;
            socket.emit("answer", {
                answer: answer,
                username: username
            })

            $homePage.fadeOut();
            $transferPage.show();
            // redirect to page 2
        }
    });

    socket.on("session-desc", function(message) {
        myPeerConn.setRemoteDescription(message.sdp).then(function() {
            if (myPeerConn.remoteDescription.type == 'offer') {
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

});
