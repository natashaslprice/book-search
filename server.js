// SERVER-SIDE JAVASCRIPT

// REQUIREMENTS //
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var request = require("request");
var session = require("express-session");
var db = require("./models/index");
require('dotenv').load();

// CONFIG //
// set ejs as view engine
app.set("view engine", "ejs");
// serve js & css files
app.use(express.static("public"));
// body parser config to accept our datatypes
app.use(bodyParser.urlencoded({extended: true}));

// use express-sessions
app.use(session({
  saveUninitialized: true,
  resave: true,
  secret: 'SuperSecretCookie',
  cookie: { maxAge: 30 * 60 * 1000 } // 30 minute cookie lifespan (in milliseconds)
}));


// RENDER
// render index page
app.get('/', function(req, res) {
  res.render("index", { hardcoverFictionList: hardcoverFictionList, paperbackFictionList: paperbackFictionList });
});

// render homepage with user's unique info
app.get('/homepage', function(req, res) {
	db.User.findOne( { _id: req.session.userId } , function(err, user) {
		console.log("user id: " + req.session.userId);
		if (err) {
			console.log(err);
		}
		else {
			console.log(user);
			res.render('homepage', { user: user } );
		}
	});
});

// render best sellers page with user's unique info
app.get('/bestsellers', function(req, res) {
	db.User.findOne( { _id: req.session.userId } , function(err, user) {
		console.log("user id: " + req.session.userId);
		if (err) {
			console.log(err);
		}
		else {
			console.log(user);
			res.render('bestsellers', { user: user, hardcoverFictionList: hardcoverFictionList, paperbackFictionList: paperbackFictionList } );
		}
	});
});

// render search page with user's unique info
app.get('/search', function(req, res) {
	db.User.findOne( { _id: req.session.userId } , function(err, user) {
		console.log("user id: " + req.session.userId);
		if (err) {
			console.log(err);
		}
		else {
			console.log(user);
			res.render('search', { user: user } );
		}
	});
});

// render recommendations page with user's unique info
app.get('/recommendations', function(req, res) {
	db.User.findOne( { _id: req.session.userId } , function(err, user) {
		console.log("user id: " + req.session.userId);
		if (err) {
			console.log(err);
		}
		else {
			console.log(user);
			res.render('recommendations', { user: user } );
		}
	});
});

// render to-read list with user's unique info
app.get('/list', function(req, res) {
	db.User.findOne( { _id: req.session.userId })
		// console.log("user id: " + req.session.userId);
		.populate('booksToRead')
		.exec(function(err, user){
			if (err) {
				console.log("the error with rendering the /list page is: ", err);
			}
			else {
				// console.log("the unique user is: ", user.firstName, "the books are: ", books);
				res.render('list', { user: user } );
				}
		});
});


// APIS
// define NYT API key
var NYT_API_KEY = process.env.NYT_API_KEY;
//this should log your secret key!
console.log(NYT_API_KEY);

// request data from NYT api for hardcover-fiction
var hardcoverFictionList;
request('http://api.nytimes.com/svc/books/v3/lists?list-name=hardcover-fiction&api-key=' + NYT_API_KEY, function(err, response, body){
	if (!err && response.statusCode == 200) {
		hardcoverFictionList = JSON.parse(body);
		// console.log("API: " + hardcoverFictionList);
	}
	else {
		console.log("error in api: " + err);
	}
});

// get route for hardcoverFictionList api
app.get('/api/hardcoverFictionList', function(req, res) {
	res.json(hardcoverFictionList);
});

// request data from NYT api for paperback-fiction
var paperbackFictionList;
request('http://api.nytimes.com/svc/books/v3/lists?list-name=mass-market-paperback&api-key=' + NYT_API_KEY, function(err, response, body){
	if (!err && response.statusCode == 200) {
		paperbackFictionList = JSON.parse(body);
		// console.log("API: " + paperbackFictionList);
	}
	else {
		console.log("error in api: " + err);
	}
});

// get route for paperbackFictionList api
app.get('/api/paperbackFictionList', function(req, res) {
	res.json(paperbackFictionList);
});

// get route for books api
app.get('/api/books', function(req, res) {
	db.Book.find( {} , function(err, books){
		if (err) {
			console.log("the error with the api/books is: ", err);
		}
		else {
			res.json(books);
		}
	});
});


// POST ROUTES
// post route for sign up form TBD - creates user but won't console.log
app.post('/api/users', function(req, res) {
	var firstName = req.body.firstName;
	var lastName = req.body.lastName;
	var email = req.body.email;
	var password = req.body.password;
	
	//create new user with form data from post route
	db.User.createSecure(firstName, lastName, email, password, function (err, user) {
		if (err) {
			console.log("Error with creating user is: " + err);
		}
		else {
			console.log("New user: " + user);
			// create session user
			req.session.userId = user._id;
			console.log(req.session.userId);
			res.json(user);
		}
	});
});

// post route for log in form
app.post('/login', function(req, res) {
	db.User.authenticate(req.body.email, req.body.password, function(err, user){
		console.log("Server.js login recognised");
		console.log(user);
		if (err) {
			console.log("Error with login form: " + err);
		}
		else if (user) {
			console.log("user logging in is: " + user);
			// create session user
			req.session.userId = user._id;
			res.json(user);
		}
		else if (!user) {
			console.log("user doesn't exist");
			res.json({});
		}
	});
});

// post route for addToListBtn
app.post('/api/books', function(req, res) {
	var author = req.body.author;
	var title = req.body.title;
	var synopsis = req.body.synopsis;
	var review = req.body.review;
	var image = req.body.image;
	var isbn = req.body.isbn;

	db.Book.create(req.body, function (err, book){
		if (err) {
			console.log("error with creating new book from addToListBtn: " + err);
		}
		else {
			console.log("the book is: ", book);
			db.User.findOne( { _id: req.session.userId } , function(err, user){
				if (err) {
					console.log("the error with finding the right user is: ", err);
				}
				else {
					user.booksToRead.push(book);
					user.save();
					res.json(user);
				}
			});
		}
	});
});


// post route to log user out
app.post('/logout', function(req, res) {
	// remove session user
	req.session.userId = null;
	// render index
	res.render('index', { hardcoverFictionList: hardcoverFictionList, paperbackFictionList: paperbackFictionList });
});





app.listen(process.env.PORT || 3000, function() {
  console.log("book-search is running on port 3000");
});

