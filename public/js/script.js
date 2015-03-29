$(function(){
	// create sentiment analysis object
	// var sentiment = require('sentiment');


	$("#search_button").on('click', function() {
		var sentence = $("#search_input").val();
		var review = sentiment(sentence);

		console.log(review);

		// HTML post request to sentiment analysis API
		// $.ajax({
		// 	type: "POST",
		// 	// url: "http://text-processing.com/api/sentiment/", 
		// 	url: "~/parser.py",
		// 	data: { param: sentence }
		// 	// dataType: 'jsonp',
		// 	// contentType: "text/plain"
		// }).done(function(data){
		// 	console.log("input: " + sentence);
		// 	console.log("response: " + data);
		// }).fail(function() {
		// 	console.log("whoops")
		// });
	})
})