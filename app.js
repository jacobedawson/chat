var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose'),
	// usernames which are currently connected to the chat
	users = {},
	rooms = {};
	
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

//create a mongoose schema
var chatSchema = mongoose.Schema({
	nick: String,
	msg: String,
	created: {type: Date, default: Date.now}
});

var Chat = mongoose.model('Message', chatSchema);
// routing
app.get('/', function(req, res){
	res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket){
	var query = Chat.find({});
	query.sort('-created').limit(50).exec(function(err, docs) {
		if(err) throw err;
		socket.emit('load old msgs', docs);
	});
 		
	socket.on('new user', function(data, callback) {
		if(data in users) {
			callback(false);
		} else {
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNicknames();
		}
	});





	function updateNicknames() {
		io.sockets.emit('usernames', Object.keys(users));
	}

	socket.on('send message', function(data, pm, callback){
		var msg = data.trim();
			//add html tags to imgs #problem - converts all links to images, need type check somehow
			if(msg.substring(0,7) === 'http://' && msg.substring(msg.length - 4) === '.gif') {
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
					users[name].emit('private', {msg: msg, nick: socket.nickname});
					users[socket.nickname].emit('private', {msg: msg, nick: socket.nickname});
				} else {
					//send public message
					var newMsg = new Chat({msg: msg, nick: socket.nickname});
					newMsg.save(function(err) {
						if(err) throw err;
						if(msg.length == 0) { 
							return; 
					}
				io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
			});	
		}
		

	});




	socket.on('disconnect', function(data) {
		if(!socket.nickname) return;
		delete users[socket.nickname];
		updateNicknames();
	});
});