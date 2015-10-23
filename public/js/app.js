// CLIENT-SIDE JAVASCRIPT
// On page load
$(document).ready(function(){
  console.log('Hey, Earth!');

  // make all fields in sign up and log in forms required
  $("#sign-up-form").validate();
  $("#log-in-form").validate();

  // on submission of sign up form
	$("#sign-up-form").on('submit', function(e){
		e.preventDefault();
		console.log($(this).serialize());
		formData = $(this).serialize();

		// post route to server
		$.ajax ({
			url: '/api/users',
			type: 'POST',
			data: formData
		})
		.done(function(data){
			console.log("sign-up form posted to server");
			// if successful, send user to /homepage
			window.location.href = '/homepage';
		})
		.fail(function(data){
			console.log("sign-up form failed to post to server");
		});
	});
	// end of submission of sign up form

  // on submission of log in form
	$("#log-in-form").on('submit', function(e){
		e.preventDefault();
		console.log($(this).serialize());
		formData = $(this).serialize();

		// post route to server
		$.ajax ({
			url: '/login',
			type: 'POST',
			data: formData
		})
		.done(function(data){
			console.log("log-in form posted to server");
			// if successful, send user to /homepage
			window.location.href = '/homepage';
		})
		.fail(function(data){
			console.log("log-in form failed to post to server");
		});
	});
	// end of submission of sign up form



}); // end of doc ready