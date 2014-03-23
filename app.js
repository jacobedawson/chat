var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose'),
	users = {};
	
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

	socket.on('send message', function(data, callback){
		var msg = data.trim();
			//add html tags to imgs #problem - converts all links to images, need type check somehow
			if(msg.substring(0,7) === 'http://' && msg.substring(msg.length - 4) === '.gif') {
			    msg = '<img src=\"' + msg + '\"\/>';
			} 

			if (msg.substring(0,7) === 'http://') {
				msg = '<a href=\"' + msg + '\" target=\"_blank\">' + msg + '</a>';
			}
			//deal with secret messages
			/*a way to direct message with double click would be to use the double click 
			event to fill the text box with e.g. DM> Jake: 
			msg.substring (0,3) === 'DM> '
			*/
		if(msg.substring(0,3) === '/w ') {
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1) {
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(name in users) {
					users[name].emit('whisper', {msg: msg, nick: socket.nickname});
					users[socket.nickname].emit('whisper', {msg: msg, nick: socket.nickname});
					console.log('Whisper!');
				} else {
					//handle nick error
					callback('Noo! Enter a real name yo');
				}
			} else {
				//handle empty msg
					callback('That ish was empty yo');	
			}
		} else {
			var newMsg = new Chat({msg: msg, nick: socket.nickname});
			newMsg.save(function(err) {
				if(err) throw err;
				if(msg.length == 0) { return; }
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