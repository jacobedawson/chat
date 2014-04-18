var UserSchema = new Schema({
	name: String,
	email: String,
	username: String,
	password: String,
	islogged: Boolean, //indicates sign-in status
	created: {type: Date, default: Date.now}
});