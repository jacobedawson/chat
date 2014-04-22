
		jQuery(function($){
			var socket = io.connect();
			var $nickForm = $('#setNick');
			var $nickError = $('#nickError');
			var $nickBox = $('#nickname');
			var $users = $('#users');
			var $messageForm = $('#send-message');
			var $messageBox = $('#message');
			var $chat = $('#msgBoxGroup');
			var $chatWindow = $('#chatWindow');
			var $gifWindow = $('#gif_window');
			var $gifButton = $('#Gif_Button');
			var $gifHide = $('#Gif_Hide');
			var $selectChannel = $('#select_channel');
			var $myChat = $('#myChat');
			var pmTarget;
			var $pmWindow = $('#' + pmTarget);
			//to capture who client is
			var whoAmI;
			//tab notification variable
			var tabNotification = 0;
			//End First Attempt
			var chatTabPrivate = $('#chatTabPrivate');

			
			//homepage 'login' - submit name, emit to server
			$nickForm.submit(function(e) {
				e.preventDefault();
				//add new user to array
				whoAmI = $nickBox.val();
				socket.emit('new user', $nickBox.val(), function(data) {
					if(data) {
						$('#nickWrap').hide();
						$('#contentWrap').show();
					} 
					else {
						$nickError.html('That name is taken bro, try another one.');
					}
				});
				$nickBox.val('');
			});

			socket.on('usernames', function(data) {
				var html = '';
				$myChat.html(whoAmI + ' "gets it"');
				//create pm div here?

				html += '<option id="group">Group</option>';
				for(var i = 0; i < data.length; i++) {
					if(data[i] == whoAmI) {
						$users.html(html);
					} else {
					html += '<option class=\"userNameBlock\" id=\"' + data[i] + '\">' + data[i] + '</option>';
				}
				$users.html(html);
				};
				//Create a PM Div for each user
				for(var i = 0; i < data.length; i++) {
					//only if it doesn't yet exist
				if ($('#msgBox' + data[i]).length == 0) {
					$('<div id=\"' + 'msgBox' + data[i] + '\"' + 'class=\"' + 'chatTabPrivate' + '\"' + '></div>').css('display', 'none').appendTo($(chatWindow));
				}
				//if the user is 'self', remove the new div so that only 3rd party divs remain
				if(data[i] == whoAmI) {
					$('#msgBox' + data[i]).remove();
				} 
				};

			});

			//private message grab	
			$("#users").on("click", 'option', function(event) {
  					//private message grab
  					pmTarget = $(this).text();
  					tabReducify();
					});

			//remove all notifications when message box is clicked
			$messageBox.on("click", function() {
				tabReducify();
				$users.find('*').removeClass('notification');
			});



			//if group is clicked, the message is to the whole group
			$('#group').on("click", 'option', function(event) {
				pmTarget = ' ';
			});


			//this essentially makes every message either group or private, with group the default
			$messageForm.submit(function(e){
				e.preventDefault();
				socket.emit('send message', $messageBox.val(), pmTarget, function() {

				});
				$messageBox.val('');
			});	


			socket.on('load old msgs', function(docs) {
				for(var i=docs.length-1; i >= 0; i--) {
					loadOldMsgs(docs[i]);
				}
			});

			//Function to distribute old messages to correct user's history - to add...
			function loadOldMsgs(data) {
				$chat.append('<div class="msg"><div class="msgFrom"><b>' + data.nick + ': </b></div>' + 
						'<div class ="msgBody">' + data.msg + '</div>' + "</div><br/>");
					$chat.scrollTop($chat[0].scrollHeight);
			}
			
			//general messaging function
			socket.on('new message', function(data){
				displayMsg(data);
				if(data.to == 'Group') {
					$('#group').addClass('notification');
				};
			});

			/*fullN[data.nick] = tabNotification;*/

			//Tab Notification Function
			function tabNotify(data) {
				if( data.nick !== whoAmI) {
				tabNotification+=1;
					$('title').text('(' + tabNotification + ') - ' + 'Mashabout - Chat with Gifs, Yo!');
					} else {
						return;
					}
			}

			function tabReducify() {
				tabNotification = 0;
				$('title').text('Mashabout - Chat with Gifs, Yo!');
			}

			//public messaging 
			function displayMsg(data) {
					tabNotify(data);	
					$chat.append('<div class="msg"><div class="msgFrom"><b>' + data.nick + ': </b></div>' + 
						'<div class ="msgBody">' + data.msg + '</div>' + "</div><br/>");
					$chat.scrollTop($chat[0].scrollHeight);

			}

			//private messaging 
			socket.on('private', function(data) {
				//add notification highlighting
				$('#' + data.nick).addClass('notification');
				displayPM(data);	
				
			});


			//remove notification
			$('#users').on('click', 'option', function() {
				$(this).removeClass('notification');
			});


			function displayPM(data) {
				//add tab message notification
					tabNotify(data);
				$('#msgBox' + data.to).append('<div class="private msg"><b><div class="msgFrom"><b>' + data.nick + ': </b></div>' + 
					'<div class ="msgBody">' + data.msg + '</div>' + "</div><br/>");
				$('#msgBox' + data.nick).append('<div class="private msg"><b><div class="msgFrom"><b>' + data.nick + ': </b></div>' + 
					'<div class ="msgBody">' + data.msg + '</div>' + "</div><br/>");
				$('#msgBox' + data.to).scrollTop($('#msgBox' + data.to)[0].scrollHeight);
			}

				//toggle content divs (still in progress)
				//currently '$this' is the entire a href tag
					$("#users").on('click', 'option', function(event) {
						var tabName = $(this).html();
						//$('#pmMsgBox' + tabName).siblings().toggle();
						$('.chatTabPrivate').not($('#msgBox' + tabName)).hide();
						$('#msgBox' + tabName).show();
						$('#msgBox' + tabName).scrollTop($('#msgBox' + tabName)[0].scrollHeight);
					});



			//error message if someone private messages themselves
			socket.on('error', function(data) {
				displayErr(data);
			});

			function displayErr(data) {
					$chat.append('<div class="msg"><div class="msgFrom"><b>' + data.nick + ': </b></div>' + '<div class ="msgBody pmError">' + data.msg + '</div>' + "</div><br/>");
					$chat.scrollTop($chat[0].scrollHeight);
			}

			
			//gifsearch area
			$gifButton.on('click',function() {
				$('#Gif_Zone').show(5);
				$gifButton.hide(5);
			});

			$gifHide.on('click',function() {
				$('#Gif_Zone').hide(5);
				$gifButton.show(5);
			});

			
			//Gif Search functionality
			var $gifsearch = $('#gif_search');


				$gifsearch.submit(function(e){
						e.preventDefault();
						$gifWindow.empty();
						if($selectChannel.val() == 'giphy') {
							//Giphy.com
								//we are now pulling the search query into the URL and grabbing a JSON object
						var getGif = "http://api.giphy.com/v1/gifs/search?q=" + $('#gifPull').val() + "&api_key=dc6zaTOxFJmzC&limit=50";
						//data object returned, now we need to pull the img url from the object and append them with img tags
						 
								$.getJSON(getGif, function(gifs) {
									for (var i = 0; i < gifs.data.length; i++) {
								  		$gifWindow.append('<img src=\"' + gifs.data[i].images.fixed_height.url + '\"\/>'); 
								  	}
								  });
						} else {
							//ReplyGif.net
							var getGif = "http://replygif.net/api/gifs?tag=" + $('#gifPull').val() + "&tag-operator=and&api-key=39YAprx5Yi";

						$.getJSON(getGif,function(json) {
							if (json.length == 0) {
								$gifWindow.append("<img src=\"http://i6.photobucket.com/albums/y215/Zalc/Gifs/supersad.gif\"/><p>Lame. ReplyGif doesn't have the tag <b>\'" + $('#gifPull').val() + "\'</b><br/>Try something else or just give up?</p>");
							}
						});

								$.getJSON(getGif, function(gifs) {
							      for(var i = 0; i < gifs.length; i++) {
							          $gifWindow.append('<img src=\"' + gifs[i].file + '\"\/>');
				              		}
				     			});
						}
						
								 
					});
					
		//end script
		});
