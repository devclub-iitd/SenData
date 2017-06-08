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
        ExchangerUsername = target_username;

    });


    var configuration = { //Needed for RTCPeerConnection
        'iceServers': [/*{
            'urls': 'stun:stun.l.google.com:19302'
        },
        {
      'urls': 'turn:192.158.29.39:3478?transport=udp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    },
    {
      'urls': 'turn:192.158.29.39:3478?transport=tcp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    }*/
        {
    urls: 'stun:10.249.208.95:3478',
    credentials: 'test',
    username: 'test'
   }
        ]
    };
    var connection = { 
	'optional': 
		[{'DtlsSrtpKeyAgreement': true}, {'SctpDataChannels': true }] 
	};
	alert("hi");
    var myPeerConn; //variable to store the RTCPeerConnection object
    var ExchangerUsername; //variable for name of requested username
	var dataChannel;
	var offerComplete=false;
    // call start() to initiate peer connection process(should be called once 'Y' answer has been received (or sent))

    function start(){ 
        myPeerConn = new RTCPeerConnection(configuration,connection);
		

        // send any ice candidates to the other peer
        myPeerConn.onicecandidate = function(evt) {
            if (evt.candidate){
                socket.emit("candidate", {
                    username: ExchangerUsername,
                    candidate: evt.candidate
                });
			}
        };
    }

    function sendLocalDesc() { //send local description to ExchangerUsername
		console.log("TRYING TO CREATE OFFER");
        var sdpConstraints = {'mandatory':
		{'OfferToReceiveAudio': false, 'OfferToReceiveVideo': false}
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
    
    //Create data channel and set event handling(the one who sends offer does this) 
		dataChannel = myPeerConn.createDataChannel("datachannel");
		
		
		dataChannel.onmessage = function(e){console.log("DC message:" +e.data);};
		dataChannel.onopen = function(){console.log("------ DATACHANNEL OPENED ------");};
		dataChannel.onclose = function(){console.log("------- DC closed! -------")};
		dataChannel.onerror = function(){console.log("DC ERROR!!!")};

    }
	
	function receiveChannelCallback(event) {
    dataChannel = event.channel;
    dataChannel.onmessage = function(e){console.log("DC message:" +e.data);};
	dataChannel.onopen = function(){console.log("------ DATACHANNEL OPENED ------(by other side)");};
	dataChannel.onclose = function(){console.log("------- DC closed! -------")};
	dataChannel.onerror = function(){console.log("DC ERROR!!!")};
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
        socket.emit('answer', {
            'username': requestingUsername,
            'answer': answer
        });
        if (answer === 'y') {
            //    if request accepted
            ExchangerUsername=requestingUsername;
            start();
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
	
	$('#file-send-button').click(function(){
		console.log(username+"I am closer");
		dataChannel.send("hey yo");
		dataChannel.send("Bye yo");
		//dataChannel.close();
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
						myPeerConn.ondatachannel=receiveChannelCallback;
						
                    })
                    .catch(function(reason) {
                        // An error occurred, so handle the failure to connect
                    });
            }
            else{
				console.log("Process complete");
			}
        })
    });

    socket.on("candidate", function(candidate) {
		if(1){                   //leave this, might have to put a condition later
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

    socket.on("PartnerDisconnected", function() {
        //stop transfer or show dialog that partner has been disconnected retry from main page
		offerComplete=false;
    });


});
