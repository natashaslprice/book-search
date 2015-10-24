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
			console.log(data);
			// if successful, send user to /homepage
			if (data.firstName) {
				window.location.href = '/homepage';
			}
			else {
				$('#alertDiv').append('<div class="alert alert-danger" role="alert">Oops! Your email or password is incorrect. Try again. </div>');
			}
		})
		.fail(function(data){
			console.log("log-in form failed to post to server");
		});
	});
	// end of submission of log in form


	// on click of log out button
	$('#log-out-btn').on('click', function(e){
		e.preventDefault();

		// post route to server
		$.ajax({
			url: '/logout',
			type: 'POST'
		})
		.done(function(data){
			console.log("log-out form posted to server");
			// if successful, redirect to index
			window.location.href = '/';
		})
		.fail(function(data){
			console.log("log-out form failed to post to server");
		});
	});
	// end of log out click


	// on click of addToListBtn
	$(document).on('click', '.addToListBtn', function(e){
		e.preventDefault();
		relevantListItem = $(this).parent().data();
		console.log(relevantListItem);

		// post route to server to create book
		$.ajax({
			url: '/api/books',
			type: 'POST',
			data: relevantListItem
		})
		.done(function(data){
			console.log("addToListBtn click posted to server");
			console.log(data);
		})
		.fail(function(data){
			console.log("addToListBtn click failed to post to server");
		});
	});






}); // end of doc ready


