$(function() {
	
	// implementing username form in a different way like socket.io
	var $mainContent = $('.main-content');
    var username = '';
    var $usernameInput = $('.usernameInput'); // Input for username
    var $loginPage = $('.login-page');
    var $window = $(window);

    // Prevents input from having injected markup
    function cleanInput (input) {
        return $('<div/>').text(input).text();
    }

    function setUsername () {
        username = cleanInput($usernameInput.val().trim());
        // If the username is valid
        if (username) {
            console.log('In setusername function when username is not empty');
            $loginPage.hide();
            $mainContent.show();

            $loginPage.off('click');
        }
    }
    $window.keydown(function (event) {
        // When the client hits ENTER on their keyboard

        if (event.which === 13) {
            event.preventDefault();
            if (!username) {
                setUsername();
            }
            else {
                $loginPage.hide();
                $mainContent.show();
                $loginPage.off('click');
            }
        }
    });
  
  
  var socket = io();
  var page_number = 0;

  /*
page_number

    case:0      page showing online user_names
    case:1      page/popup showing waiting for permission
                    (other buttons should not be accesible during this time)
    case:2      page of send


  */
  socket.emit('login', username);
  var flag = 0;




  socket.on("update list", function(connected_clients) {
    // connected_clients is a dictionary
    // use the keys to update list of user_names
    // if the user is on page_number =0 ;
  })

  // call this function when any username is clicked and
  // also in the meantime show the screen that
  // waiting for permission of user
  // page_number=1


  // save name of requested user as ExhangerUsername
  socket.emit("offer", /*pass username of client clicked*/ );

  socket.on("answer", function(answer) {
    // if answer is yes.....goto page_number=2
    // rest code follows.................


    // else set ExchangeUsername to None

  })


  socket.on("offer", function(username) {
    // show that username wants to connect to you
    // accept or deny
    // append as feed on the side//IE ANOTHER MODAL
    //CHANGE THAT MODAL'S CSS DISPLAY ATTRIBUTE FROM HIDDEN TO BLOCK OR SOMETHING


    // if accepted any one set ExchangeUsername to username
    // redirect to page 2
  })

});
