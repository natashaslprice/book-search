// SERVER-SIDE JAVASCRIPT

// REQUIREMENTS //
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var request = require("request");
var session = require("express-session");
var cookieParser = require('cookie-parser');
var db = require("./models/index");
require('dotenv').load();

// CONFIG //
// set ejs as view engine
app.set("view engine", "ejs");
// serve js & css files
app.use(express.static("public"));
// body parser config to accept our datatypes
app.use(bodyParser.urlencoded({extended: true}));
// use cookie-parser
app.use(cookieParser());

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
  res.render("index", { lowerCaseHardcoverFictionList: lowerCaseHardcoverFictionList, lowerCasePaperbackFictionList: lowerCasePaperbackFictionList });
});

// render homepage with user's unique info
app.get('/homepage', function(req, res) {
	db.User.findOne( { _id: req.session.userId } , function(err, user) {
		console.log("user id: " + req.session.userId);
		if (err) {
			console.log(err);
		}
		else {
			// console.log(user);
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
			// console.log(user);
			res.render('bestsellers', { user: user, lowerCaseHardcoverFictionList: lowerCaseHardcoverFictionList, lowerCasePaperbackFictionList: lowerCasePaperbackFictionList } );
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
			// console.log(user);
			res.render('search', { user: user } );
		}
	});
});

// render recommendations page with user's unique info
app.get('/recommendations', function(req, res) {
	// find user by session id
	db.User.findById(req.session.userId)
	.populate('booksReadEnjoyed')
	.exec(function(err, user) {
		// find other users who have read these books
		console.log("session user is: ", user);
		db.User.find( { booksReadEnjoyed: { $in: user.booksReadEnjoyed } } , function(err, users) {
			console.log("allUsers found are: ", users.length);
			// find all books in these users
			db.Book.find( { usersReadEnjoyed: { $in: users } } , function(err, books) {
				for (var i = 0; i < books.length; i++) {
					for (var j = 0; j < user.booksReadEnjoyed.length; j++) {
						if (books[i] && user.booksReadEnjoyed[j]) {
							if (books[i].title === user.booksReadEnjoyed[j].title) {
								books.splice(i, 1);
							}
						}
					}
				}
				console.log("allBooks found are: ", books);
				res.render('recommendations', { user: user, books: books } );
			});
		});
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
			else if (user.booksToRead.length > 1) {
				// console.log("the array before the function: ", user.booksToRead);
				// user.booksToRead.sort(compare);
				// console.log("the sorted array: ", user.booksToRead);
				// eliminateDuplicates(user.booksToRead);
				// console.log("the array after the function: ", user.booksToRead);
				res.render('list', { user: user } );
			}
			else {
				res.render('list', { user: user } );
			}
		});
});

// render contact us with user's unique info
app.get('/contact', function(req, res) {
	db.User.findOne( { _id: req.session.userId } , function(err, user) {
		console.log("user id: " + req.session.userId);
		if (err) {
			console.log(err);
		}
		else {
			// console.log(user);
			res.render('contact', { user: user } );
		}
	});
});


// POST ROUTES
// post route for sign up form 
app.post('/api/users', function(req, res) {
	var firstName = req.body.firstName;
	var lastName = req.body.lastName;
	var email = req.body.email;
	var password = req.body.password;

	// check user with that email doesn't already exist
	db.User.findOne( { email: email } , function(err, user) {
		if (err) {
			console.log("the error with finding the user by email is: ", err);
		}
		// if the user does not already exist
		else if (user === null) {
			console.log("the user does not already exist, proceed to make new user");
			//create new user with form data from post route
			db.User.createSecure(firstName, lastName, email, password, function (err, user) {
				if (err) {
					console.log("Error with creating user is: " + err);
				}
				else {
					console.log("New user: " + user);
					// create session user
					req.session.userId = user._id;
					// console.log(req.session.userId);
					res.json(user);
				}
			});
		}
		// else user does already exist, send back empty object and alert on client
		else {
			console.log("the user already exists");
			res.json({});
		}
	});
});

// post route for log in form
app.post('/login', function(req, res) {
	db.User.authenticate(req.body.email, req.body.password, function(err, user){
		console.log("Server.js login recognised");
		// console.log(user);
		if (err) {
			console.log("Error with login form: " + err);
		}
		else if (user) {
			// console.log("user logging in is: " + user);
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

// post route for userBookForm
app.post('/api/userbooks', function(req, res) {
	var title = req.body.title;
	console.log("the title of the book entered is: ", title);
	// request data from google books api based on book title, ordered by relevance, language en
	var book = findUserBooks(title, function(books) {
		// console.log("Books are: ", books);
		// if there are books
		if (books.items) {
			var booksArr = books.items;
			// console.log(booksArr);
			// use functions to find author, title, synopsis, isbn, image for each book
			var bookAuthor = findAuthor(booksArr);
			var bookTitle = findTitle(booksArr);
			var bookSynopsis = findSynopsis(booksArr);
			var bookImage = findImage(booksArr);
			var bookIsbn = findIsbn(booksArr);
			console.log("The book details are ", bookAuthor, bookTitle, bookSynopsis, bookImage, bookIsbn);
			// find if book already exists on db
			db.Book.findOne( { title: bookTitle } , function(err, book) {
				// if err
				if (err) {
					console.log("the error with finding the book was: ", err);
				}
				// if the book does not already exist
				else if (book === null) {
					console.log("book did not already exist");
					// create book with those things
					db.Book.create( { author: bookAuthor, title: bookTitle, synopsis: bookSynopsis, image: bookImage, isbn: bookIsbn } , function (err, book){
						if (err) {
							console.log("error with creating new book from booksReadEnjoyed: " + err);
						}
						else {
							console.log("the book is: ", book);
							// find session user
							db.User.findOne( { _id: req.session.userId } , function(err, user){
								if (err) {
									console.log("the error with finding the right user is: ", err);
								}
								else {
									user.booksReadEnjoyed.push(book);
									user.save();
									book.usersReadEnjoyed.push(user);
									book.save();
									res.json(book);
								}
							});
						}
					});
				}
				// else book does already exist, push book into user and user into book
				else {
					console.log("the book already existed");
					// find session user
					db.User.findOne( { _id: req.session.userId } , function(err, user){
						console.log("session user is: ", req.session.userId);
						if (err) {
							console.log("the error with finding the right user is: ", err);
						}
						else {
							user.booksReadEnjoyed.push(book);
							user.save();
							book.usersReadEnjoyed.push(user);
							book.save();
							res.json(book);
						}
					});
				}
			});
		}
		// else if there are no books
		else {
			console.log("ending loop and sending back empty books!");
			res.json(books);
		}
	});
});

// post route for addToListBtn
app.post('/api/bookslist', function(req, res) {
	var author = req.body.author;
	var title = req.body.title;
	var synopsis = req.body.synopsis;
	var review = req.body.review;
	var image = req.body.image;
	var isbn = req.body.isbn;

	// find if book already exists on db
	db.Book.findOne( { title: title } , function(err, book) {
		// if err
		if (err) {
			console.log("the error with finding the book was: ", err);
		}
		// if the book does not already exist
		else if (book === null) {
			console.log("book did not already exist");
			// create book with those things
			db.Book.create(req.body, function (err, book){
				if (err) {
					console.log("error with creating new book from addToListBtn: " + err);
				}
				else {
					console.log("the book being put on the list is: ", book);
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
		}
		// if book does already exist, push book into user
		else {
			console.log("the book already existed");
			db.User.findOne( { _id: req.session.userId } )
			.populate('booksToRead')
			.exec(function(err, user){
				if (err) {
					console.log("the error with finding the right user is: ", err);
				}
				console.log("session user is: ", req.session.userId);
				// check if book already exists in user
				if (user.booksToRead.length === 0) {
					user.booksToRead.push(book);
					user.save();
					console.log("booksToRead was empty, first book pushed");
				}
				else {
					var found = false;
					for (var i = 0; i < user.booksToRead.length; i++) {
						if (book.title === user.booksToRead[i].title) {
							console.log("the book already exists in the user so not pushed");
							found = true;
							break;
						}
					}
					if (!found) {
						user.booksToRead.push(book);
						user.save();
						console.log("the book not in user yet, so pushed");
					}
				}
				res.json(user);
			});
		}
	});
});

// post route for readEnjoyedBtn
app.post('/api/booksreadenjoyed', function(req, res) {
	var author = req.body.author;
	var title = req.body.title;
	var synopsis = req.body.synopsis;
	var review = req.body.review;
	var image = req.body.image;
	var isbn = req.body.isbn;

	// find if book already exists on db
	db.Book.findOne( { title: title } , function(err, book) {
		// if err
		if (err) {
			console.log("the error with finding the book was: ", err);
		}
		// if the book does not already exist
		else if (book === null) {
			console.log("book did not already exist");
			// create book with those things
			db.Book.create(req.body, function (err, book){
				if (err) {
					console.log("error with creating new book from booksReadEnjoyed: " + err);
				}
				else {
					console.log("the book is: ", book);
					db.User.findOne( { _id: req.session.userId } , function(err, user){
						if (err) {
							console.log("the error with finding the right user is: ", err);
						}
						else {
							user.booksReadEnjoyed.push(book);
							user.save();
							book.usersReadEnjoyed.push(user);
							book.save();
							res.json(user);
						}
					});
				}
			});
		}
		// if book does already exist, push book into user
		else {
			console.log("the book already existed");
			db.User.findOne( { _id: req.session.userId } , function(err, user){
				console.log("session user is: ", req.session.userId);
				if (err) {
					console.log("the error with finding the right user is: ", err);
				}
				else {
					user.booksReadEnjoyed.push(book);
					user.save();
					book.usersReadEnjoyed.push(user);
					book.save();
					res.json(user);
				}
			});
		}
	});
});

// post route for authorSearch
app.post('/api/authorsearch', function(req, res) {
	// console.log(req.body);
	var authorSearchFirstName = req.body.authorSearchFirstName;
	var authorSearchLastName = req.body.authorSearchLastName;
	// request data from google books api based on authors first and last name, ordered by newest, language en, max results (40)
	request('https://www.googleapis.com/books/v1/volumes?q=inauthor:"' + authorSearchFirstName + '+' + authorSearchLastName + '"&startIndex=0&maxResults=40&orderBy=newest&langRestrict=en&key=' + GOOGLE_BOOKS_API_KEY, function(err, response, body){
		if (!err && response.statusCode == 200) {
			console.log("Server request worked");
			var list = JSON.parse(body);
			// console.log(list.items);
			// check results have books and if so send back books
			if (list.items) {
				// sort the list array
				list.items.sort(compareGoogle);
				// elimate duplicates from the list
				eliminateDuplicatesGoogle(list.items);
				// console.log("the list after removing duplicates: ", list.items);
				// send back sorted and cleaned list
				res.json(list);
			}
			// else send back empty object
			else {
				res.json({});
			}
		}
		else {
			console.log("error finding author: ", err);
			res.json({});
		}
	});
});

// post route for bookSearch
app.post('/api/booksearch', function(req, res) {
	// console.log(req.body);
	var bookSearchName = req.body.bookSearchName;
	// request data from google books api based on book name, ordered by relevance, language en
	request('https://www.googleapis.com/books/v1/volumes?q=intitle:' + bookSearchName + '&orderBy=relevance&langRestrict=en&key=' + GOOGLE_BOOKS_API_KEY, function(err, response, body){
		if (!err && response.statusCode == 200) {
			console.log("Found book");
			var books = JSON.parse(body);
			// check results have books
			if (books.items) {
				// if so, send back books
				var booksArr = books.items;
				// if there is a descripton, find author of first book
				var bookAuthor = findAuthor(booksArr);
				// console.log("book author is: ", bookAuthor);
				// find authors name parts
				var bookAuthorObject = bookAuthor.split(" ");
				var bookAuthorFirstName = bookAuthorObject[0];
				var bookAuthorSecondName = bookAuthorObject[1];
				var bookAuthorThirdName = bookAuthorObject[2];
				// console.log(bookAuthorFirstName, bookAuthorSecondName, bookAuthorThirdName);
				// if thirdName is undefined
				if (bookAuthorThirdName === undefined) {
					// new request for books by this author based on authors first and second name, ordered by newest, language en, max results (40)
					request('https://www.googleapis.com/books/v1/volumes?q=inauthor:"' + bookAuthorFirstName + '+' + bookAuthorSecondName + '"&startIndex=0&maxResults=40&orderBy=newest&langRestrict=en&key=' + GOOGLE_BOOKS_API_KEY, function(err, response, body){
						if (!err && response.statusCode == 200) {
							console.log("Found author");
							var list = JSON.parse(body);
							// console.log(list.items);
							// sort the list array
							list.items.sort(compareGoogle);
							// elimate duplicates from the list
							eliminateDuplicatesGoogle(list.items);
							// console.log("the list after removing duplicates: ", list.items);
							// send back sorted and cleaned list
							res.json(list);
						}
						else {
							console.log("error finding author: ", err);
							res.json({});
						}
					});
				}
				// else if thirdName
				else {
					// new request for books by this author based on authors first and second and third name, ordered by newest, language en, max results (40)
					request('https://www.googleapis.com/books/v1/volumes?q=inauthor:"' + bookAuthorFirstName + '+' + bookAuthorSecondName + '+' + bookAuthorThirdName + '"&startIndex=0&maxResults=40&orderBy=newest&langRestrict=en&key=' + GOOGLE_BOOKS_API_KEY, function(err, response, body){
						if (!err && response.statusCode == 200) {
							console.log("Found author");
							var list = JSON.parse(body);
							// console.log(list.items);
							// sort the list array
							list.items.sort(compareGoogle);
							// elimate duplicates from the list
							eliminateDuplicatesGoogle(list.items);
							// console.log("the list after removing duplicates: ", list.items);
							// send back sorted and cleaned list
							res.json(list);
						}
						else {
							console.log("error finding author: ", err);
							res.json({});
						}
					});
				}
			}
			// else send back empty object
			else {
				res.json({});
			}
		}
		else {
			console.log("error finding author: ", err);
			res.json({});
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


// DELETE ROUTES
// delete route for deleteBook button
app.delete('/api/bookslist/:id', function(req, res) {
	var bookId = req.params.id;
	console.log(bookId);	
	// find session user
	db.User.findOne( { _id: req.session.userId } , function(err, user){
		if (err) {
			console.log("the error with finding the user is: ", err);
		}
		else {
			// console.log(user.booksToRead);
			// find index of bookId in the booksToRead array
			var index = user.booksToRead.indexOf(bookId);
			// console.log(index);
			// remove the book and save the user
			user.booksToRead.splice(index, 1);
			user.save();
			// console.log(user.booksToRead);
			// send back the response with the new array
			res.json(user.booksToRead); 
		}
	});
});



// APIS
// define NYT API key
var NYT_API_KEY = process.env.NYT_API_KEY;
//this should log your secret key!
// console.log(NYT_API_KEY);

// request data from NYT api for hardcover-fiction
var hardcoverFictionList;
var lowerCaseHardcoverFictionList;
request('http://api.nytimes.com/svc/books/v3/lists?list-name=hardcover-fiction&api-key=' + NYT_API_KEY, function(err, response, body){
	if (!err && response.statusCode == 200) {
		hardcoverFictionList = JSON.parse(body);
		// console.log("API before function: " + hardcoverFictionList.results[0].book_details[0].title);
		lowerCaseHardcoverFictionList = toLowerCaseFunction(hardcoverFictionList.results);
		// console.log("API after function: " + lowerCaseHardcoverFictionList[0].book_details[0].title);
	}
	else {
		console.log("error in api: " + err);
	}
});

// get route for lowerCaseHardcoverFictionList api
app.get('/api/hardcoverFictionList', function(req, res) {
	res.json(lowerCaseHardcoverFictionList);
});

// request data from NYT api for paperback-fiction
var paperbackFictionList;
var lowerCasePaperbackFictionList;
request('http://api.nytimes.com/svc/books/v3/lists?list-name=mass-market-paperback&api-key=' + NYT_API_KEY, function(err, response, body){
	if (!err && response.statusCode == 200) {
		paperbackFictionList = JSON.parse(body);
		// console.log("API: " + paperbackFictionList);
		lowerCasePaperbackFictionList = toLowerCaseFunction(paperbackFictionList.results);
	}
	else {
		console.log("error in api: " + err);
	}
});

// get route for lowerCasePaperbackFictionList api
app.get('/api/paperbackFictionList', function(req, res) {
	res.json(lowerCasePaperbackFictionList);
});

// get route for books api
app.get('/api/bookslist', function(req, res) {
	db.Book.find( {} , function(err, books){
		if (err) {
			console.log("the error with the api/books is: ", err);
		}
		else {
			res.json(books);
		}
	});
});

// define NYT API key
var GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
//this should log your secret key!
// console.log(GOOGLE_BOOKS_API_KEY);




app.listen(process.env.PORT || 3000, function() {
  console.log("book-search is running on port 3000");
});


// FUNCTIONS

// make all titles from NYT API lowercase
function toLowerCaseFunction(arr) {
	for (var i = 0; i < arr.length; i++) {
		arr[i].book_details[0].title = arr[i].book_details[0].title.toLowerCase();
		// console.log(arr[i].book_details[0].title.toLowerCase());
	}
	return arr;
}

// sort by title function in user arrays function
function compare(a,b) {
  if (a.title < b.title)
    return -1;
  if (a.title > b.title)
    return 1;
  return 0;
}

// elimate duplicates from user arrays function
function eliminateDuplicates(arr) {
  for (i = 0; i < arr.length - 1; i++) {
    if (arr[i].title === arr[i + 1].title) {
    	arr.splice(i, 1);
    	i = i - 1;
    }
	}
	return arr;
}

// sort by title function in google search function
function compareGoogle(a,b) {
  if (a.volumeInfo.title < b.volumeInfo.title)
    return -1;
  if (a.volumeInfo.title > b.volumeInfo.title)
    return 1;
  return 0;
}

// elimate duplicates from google search function
function eliminateDuplicatesGoogle(arr) {
  for (i = 0; i < arr.length - 1; i++) {
    if (arr[i].volumeInfo.title === arr[i + 1].volumeInfo.title) {
    	arr.splice(i, 1);
    	i = i - 1;
    }
	}
	return arr;
}

// find first book with a description and return that author function
function findAuthor(arr) {
	for (var i = 0; i < arr.length - 1; i++) {
		if (arr[i].volumeInfo.description) {
			// console.log("inside the function found: ", arr[i].volumeInfo.authors[0]);
			return arr[i].volumeInfo.authors[0];
		}
	}
}

// find first book with a description and return that title function
function findTitle(arr) {
	for (var i = 0; i < arr.length - 1; i++) {
		if (arr[i].volumeInfo.description) {
			// console.log("inside the function found: ", arr[i].volumeInfo.title);
			return arr[i].volumeInfo.title;
		}
	}
}

// find first book with a description and return that synopsis function
function findSynopsis(arr) {
	for (var i = 0; i < arr.length - 1; i++) {
		if (arr[i].volumeInfo.description) {
			// console.log("inside the function found: ", arr[i].volumeInfo.description);
			return arr[i].volumeInfo.description;
		}
	}
}

// find first book with an description and return that image function
function findImage(arr) {
	for (var i = 0; i < arr.length - 1; i++) {
		if (arr[i].volumeInfo.description && arr[i].volumeInfo.imageLinks) {
			// console.log("inside the function found: ", arr[i].volumeInfo.imageLinks.smallThumbnail);
			return arr[i].volumeInfo.imageLinks.smallThumbnails;
		}
	}
}

// find first book with an description and return that isbn function
function findIsbn(arr) {
	for (var i = 0; i < arr.length - 1; i++) {
		if (arr[i].volumeInfo.description && arr[i].volumeInfo.industryIdentifiers) {
			// console.log("inside the function found: ", arr[i].volumeInfo.industryIdentifiers[0].identifier);
			return arr[i].volumeInfo.industryIdentifiers[0].identifier;
		}
	}
}

// find userBooks function
function findUserBooks(title, callback) {
	request('https://www.googleapis.com/books/v1/volumes?q=intitle:' + title + '&orderBy=relevance&langRestrict=en&key=' + GOOGLE_BOOKS_API_KEY, function(err, response, body){
		if (!err && response.statusCode == 200) {
			console.log("Found book");
			// check results have books and if so send back books
			var list = JSON.parse(body);
			if (list.items) {
				console.log("the function has found items");
				// sort the list array
				list.items.sort(compareGoogle);
				// elimate duplicates from the list
				eliminateDuplicatesGoogle(list.items);
				// console.log("the list after removing duplicates: ", list.items);
				// send back sorted and cleaned list
				callback(list);
			}
			// else send back empty object
			else {
				console.log("the function failed to find items");
				callback({});
			}
		}
		else {
			console.log("the error with getting the userBookForm data is: ", err);
			callback({});
		}
	});
}







