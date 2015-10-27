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
	db.User.findOne( { _id: req.session.userId })
	// populate the books the user has enjoyed
	.populate('booksReadEnjoyed')
	.exec(function(err, user) {
		console.log("user id: " + req.session.userId);
		if (err) {
			console.log("the error with finding the user was: ", err);
		}
		else {
			// console.log(user);
			// sort books by title
			user.booksReadEnjoyed.sort(compare);
			// elimate duplicates
			eliminateDuplicates(user.booksReadEnjoyed);
			// console.log(user.booksReadEnjoyed);
			// console.log answer --> an array of book objects, in order with no duplicates
			// for each book that user has read and enjoyed
			for (var i = 0; i < user.booksReadEnjoyed.length; i++) {
				// find title
				var bookEnjoyedTitle_i = user.booksReadEnjoyed[i].title;
				console.log("all the books this user has enjoyed are: ", bookEnjoyedTitle_i);
				// find book on db
				db.Book.findOne( { title: bookEnjoyedTitle_i })
				// populate the users that have liked this book
				.populate('usersReadEnjoyed')
				.exec(function(err, book) {
					if (err) {
						console.log("the error with finding the book on the db is: ", err);
					}
					else {
						console.log("the book was found in the db: ", book);
						// for each user that has read and enjoyed this book
						for (var j = 0; j < book.usersReadEnjoyed.length; j++) {
							// find ids
							var usersReadEnjoyedId_j = book.usersReadEnjoyed[j]._id;
							console.log("the users who have enjoyed this book: ", usersReadEnjoyedId_j);
							// find user on db
							db.User.findOne( { _id: usersReadEnjoyedId_j })
							// populate the books that these other users have read and enjoyed
							.populate('booksReadEnjoyed')
							.exec(function(err, user) {
								if (err) {
									console.log("the error with finding the users that have read and enjoyed this book is: ", err);
								}
								else {
									var otherBooksReadEnjoyed = user.booksReadEnjoyed;
									console.log("the other books to read and enjoy are: ", otherBooksReadEnjoyed);
								}
							});
						}
					}
				});	
			}
		}
			res.render('recommendations', { user: user } );
	});
});

// search users db based on ids
// find all books that those users have read and enjoyed




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
				user.booksToRead.sort(compare);
				// console.log("the sorted array: ", user.booksToRead);
				eliminateDuplicates(user.booksToRead);
				// console.log("the array after the function: ", user.booksToRead);
				res.render('list', { user: user } );
			}
			else {
				res.render('list', { user: user } );
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
			// console.log(req.session.userId);
			res.json(user);
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
	var userBooks = [];
	var bookOne = req.body.userBookOne;
	var bookTwo = req.body.userBookTwo;
	var bookThree = req.body.userBookThree;
	userBooks.push(bookOne, bookTwo, bookThree);
	// console.log(userBooks);
	// request data from google books api based on each book name, ordered by relevance, language en
	for (var i = 0; i < userBooks.length; i++) {
		var book_i = findUserBooks(userBooks[i], function(books) {
			// console.log("book_i", books);
			var booksArr_i = books.items;
			// console.log(booksArr_i);
			// use functions to find author, title, synopsis, isbn, image for each book
			var bookAuthor_i = findAuthor(booksArr_i);
			var bookTitle_i = findTitle(booksArr_i);
			var bookSynopsis_i = findSynopsis(booksArr_i);
			var bookImage_i = findImage(booksArr_i);
			var bookIsbn_i = findIsbn(booksArr_i);
			// console.log("The book", i, " details are ", bookAuthor_i, bookTitle_i, bookSynopsis_i, bookImage_i, bookIsbn_i);
			// console.log("Book ", i, " is: ", book_i);
			// find if book already exists on db
			db.Book.findOne( { title: bookTitle_i } , function(err, book) {
				// if err
				if (err) {
					console.log("the error with finding the book was: ", err);
				}
				// if the book does not already exist
				else if (book === null) {
					console.log("book did not already exist");
					// create book with those things
					db.Book.create( { author: bookAuthor_i, title: bookTitle_i, synopsis: bookSynopsis_i, image: bookImage_i, isbn: bookIsbn_i } , function (err, book){
						if (err) {
							console.log("error with creating new book from booksReadEnjoyed: " + err);
						}
						else {
							console.log("the book", i, " is: ", book);
							db.User.findOne( { _id: req.session.userId } , function(err, user){
								if (err) {
									console.log("the error with finding the right user is: ", err);
								}
								else {
									user.booksReadEnjoyed.push(book);
									user.save();
									book.usersReadEnjoyed.push(user);
									book.save();
								}
							});
						}
					});
				}
				// if book does already exist, push book into user and user into book
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
						}
					});
				}
			});
		});
	} 
	res.json({});
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
			db.User.findOne( { _id: req.session.userId } , function(err, user){
				console.log("session user is: ", req.session.userId);
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


// GET ROUTES



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
function findUserBooks(name, callback) {
	request('https://www.googleapis.com/books/v1/volumes?q=intitle:' + name + '&orderBy=relevance&langRestrict=en&key=' + GOOGLE_BOOKS_API_KEY, function(err, response, body){
		if (!err && response.statusCode == 200) {
			console.log("Found book");
			// console.log("the body json parsed is: ", JSON.parse(body));
			callback(JSON.parse(body));
	
		}
		else {
			console.log("the error with getting the userBookForm data is: ", err);
		}
	});
}




