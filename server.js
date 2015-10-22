// SERVER-SIDE JAVASCRIPT

// REQUIREMENTS //
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var request = require("request");
var db = require("./models/index");
require('dotenv').load();

// CONFIG //
// set ejs as view engine
app.set("view engine", "ejs");
// serve js & css files
app.use(express.static("public"));
// body parser config to accept our datatypes
app.use(bodyParser.urlencoded({extended: true}));

// render index page
app.get('/', function(req, res) {
  res.render("index", { hardcoverFictionList: hardcoverFictionList });
});

// define NYT API key
var NYT_API_KEY = process.env.NYT_API_KEY;
//this should log your secret key!
console.log(NYT_API_KEY);

// request data from NYT api
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


app.listen(process.env.PORT || 3000, function() {
  console.log("book-search is running on port 3000");
});

