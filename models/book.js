var mongoose = require('mongoose'),
		Schema = mongoose.Schema,
		User = require('./user');

var BookSchema = new Schema({
		author: String,
		title: String,
		synopsis: String,
		review: String,
		image: String,
		ISBN: Number,
		usersReadEnjoyed: [{type: Schema.Types.ObjectId, ref: 'User'}]
});

var Book = mongoose.model('Book', BookSchema);

module.exports = Book;