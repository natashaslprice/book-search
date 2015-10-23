var mongoose = require("mongoose");

mongoose.connect(process.env.MONGOLAB_URI ||
                 process.env.MONGOHQ_URL || 
                 "mongodb://localhost/book-search");

module.exports.User = require('./user.js');
module.exports.Book = require('./book.js');

