var mongoose = require('mongoose'),
		Schema = mongoose.Schema,
		bcrypt = require('bcrypt'),
		salt = bcrypt.genSaltSync(10),
		Book = require('./book');


var UserSchema = new Schema({
		firstName: String,
		lastName: String,
		email: { type: String, set: toLower },
		passwordDigest: String,
		booksReadEnjoyed: [{type: Schema.Types.ObjectId, ref: 'Book'}],
		booksToRead: [{type: Schema.Types.ObjectId, ref: 'Book'}]
});

UserSchema.statics.createSecure = function(firstName, lastName, email, password, callback) {
	var user = this;

	bcrypt.genSalt (function(err, salt){
		bcrypt.hash(password, salt, function(err, hash){
			console.log(hash);

			user.create( { firstName: firstName, lastName: lastName, email: email, passwordDigest: hash }, callback);
		});
	});
};

UserSchema.statics.authenticate = function (email, password, callback){
	this.findOne( { email: email } , function(err, user){
		if (err) {
			console.log(err + " with user authentication");
		}
		else if (!user) {
			console.log("No user with email: " + email);
			callback(err, null);
		}
		else if (user.checkPassword(password)) {
			callback(null, user);
		}
		else {
			callback(err, null);
		}
	});
};

UserSchema.methods.checkPassword = function(password){
	return bcrypt.compareSync(password, this.passwordDigest);
};

function toLower(v) {
	return v.toLowerCase();
}

var User = mongoose.model('User', UserSchema);

module.exports = User;