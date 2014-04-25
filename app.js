var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose'),
	// usernames which are currently connected to the chat
	users = {};

	//express compress middleware
	app.use(express.compress());

	//Add static middleware to serve static content
	app.use(express.static(__dirname + '/public'));

//ask the server to listen for action on port 3000	
server.listen(3000);

//connect to database at location, log error or log success
mongoose.connect('mongodb://localhost/chat', function(err) {
	if(err) {
		console.log(err);
	} else {
		console.log('connected to mongodb!');
	}
});

/* 
###Area Above This unique to environment###
*/


// hash object to save clients data,
// { socketid: { clientid, nickname }, socketid: { ... } }
chatClients = new Object();

//set the log level of socket.io, with log level 2
//we won't see all the heartbeats of each sockets, 
//only the handshakes and disconnections
io.set('log level', 3);


// setting the transports by order, if some client
// is not supporting 'websockets' then the server will
// revert to 'xhr-polling' (like Comet/Long polling).
// for more configurations go to:
// https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
io.set('transports', [ 'websocket', 'xhr-polling' ]);


Schema = mongoose.Schema;

//create a mongoose schema for the chat
var chatSchema = new Schema({
	nick: String,
	msg: String,
	created: {type: Date, default: Date.now}
});


//create a mongoose schema for user management i.e. logins and passwords
//contained in the file 'user.js'
var usermodel = require(__dirname + '/models/user.js');


var Chat = mongoose.model('Message', chatSchema);

// routing
app.get('/', function(req, res){
	res.sendfile(__dirname + '/index.html');
});


//function to handle each connection event
//'load old msgs' is emitted to each client upon connection
io.sockets.on('connection', function(socket){
	var query = Chat.find({});
	//sort messages from oldest to newest, limit equals number of msgs to save
	query.sort('-created').limit(50).exec(function(err, docs) {
		if(err) throw err;
		socket.emit('load old msgs', docs);
	});
 		
	socket.on('new user', function(data, callback) {
		//first check if user is logged in
		if(data in users) {
			callback(false);
			//otherwise, send true, save data as the client name
		} else {
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNicknames();
			console.log(data + ' has a socket no. of ' + socket.id);
		}
	});





	function updateNicknames() {
		io.sockets.emit('usernames', Object.keys(users));
	}

	//create regular expression to look for img extensions
	var myRegEx = new RegExp("^(https?|ftp)://.*(jpeg|png|jpg|gif|bmp)");

	socket.on('send message', function(data, pm, callback){
		var msg = data.trim();
			//add html tags to imgs #problem - converts all links to images, need type check somehow
			/*if(msg.substring(0,7) === 'http://' && msg.substring(msg.length - 4) === '.gif') {
			    msg = '<img src=\"' + msg + '\"\/>';
			} */

			//check regular expression against message, append img tags where appropriate
			if(myRegEx.test(msg)) {
				msg = '<img src=\"' + msg + '\"\/>';
			}


			//checks for links, adds anchor tags
			if (msg.substring(0,7) === 'http://' || msg.substring(0,8) === 'https://') {
				msg = '<a href=\"' + msg + '\" target=\"_blank\">' + msg + '</a>';
			}

			
				//deal with secret messages
				var name = pm;
				//prevent people messaging themselves UPDATE: (no longer needed actually...)
				if(users[name] === users[socket.nickname]) {
					users[socket.nickname].emit('error', {msg: "lol u just tried 2 message urself haha get some sleep yo ;)", nick: socket.nickname});
					return;
				}
				//prevent sending empty messages
				if(name in users) {
					if(msg.length == 0) { 
						return; 
					}

					//send private message
					users[name].emit('private', {msg: msg, nick: socket.nickname, to: pm});
					users[socket.nickname].emit('private', {msg: msg, nick: socket.nickname, to: pm});
				} else {
					//send public message
					var newMsg = new Chat({msg: msg, nick: socket.nickname});
					newMsg.save(function(err) {
						if(err) throw err;
						if(msg.length == 0) { 
							return; 
					}
					//if there is only 1 user online
					if(Object.keys(users).length <= 1) {
						msg = "<b>Ain\'t nobody else here, player :(</b><br><img src=\"http://static.nme.com/images/tumbleweed01.jpg\"/><b>You should *totes* invite someone else.<br>Don\'t leave me hanging on like a solo...</b>";
					}
				io.sockets.emit('new message', {msg: msg, nick: socket.nickname, to: pm});
			});	
		}
		

	});




	socket.on('disconnect', function(data) {
		if(!socket.nickname) return;
		delete users[socket.nickname];
		updateNicknames();
	});
});