var moment = require('moment');
var sentiment = require('sentiment');
var ejs = require('ejs');
var oracledb = require('oracledb');
var dbconfig = require('../dbconfig.js')
var oracleConnectInfo = {user: dbconfig.user, password: dbconfig.password, connectString: dbconfig.connectString};
var gm = require('googlemaps');

// // We export the init() function to initialize
// // our KVS values
exports.init = function(callback) {
	callback();
};

/**
 * Default index page fetches some content and returns it
 */
exports.example = function(req, res) {
	res.render('example');
	return;
}

exports.index = function(req, res) {
	res.render('index');
}

exports.populateSearchResults = function(req, res) {
	if (! req.session.search_results) {
		res.render('/');
	}
	else {
		res.render('search', {results: JSON.stringify(req.session.search_results)});
	}
}

 exports.getReviews = function (req, res) {
	oracledb.getConnection(oracleConnectInfo, function(err, connection) {
		if (err) {
			console.log(err.stack);
		}
		var location = req.body.location;
		var restaurant = req.body.restaurant;
		var food = req.body.food;
		var sqlRestaurant = "'%" + restaurant.toLowerCase() + "%'";
		var sqlFood = "'%" + food.toLowerCase() + "%'";
		connection.execute("SELECT B.name, B.address, R.text, R.stars, R.rdate "
			+ 			   "FROM businesses B, reviews R "
			+              "WHERE B.business_id = R.business_id AND LOWER(B.name) LIKE " + sqlRestaurant + " AND LOWER(R.text) LIKE " + sqlFood, 

							{}, {outFormat: oracledb.OBJECT}, function(err, reviewsResult) {
			if (err) {
				console.log("error executing business query");
				console.log(err);
			} 
			else {
				connection.execute("SELECT B.name, B.address, T.text, T.tdate "
			+ 			   "FROM businesses B, tips T "
			+              "WHERE B.business_id = T.business_id AND LOWER(B.name) LIKE " + sqlRestaurant + " AND LOWER(T.text) LIKE " + sqlFood, 

							{}, {outFormat: oracledb.OBJECT}, function(err, tipsResult) {

					var reviews = reviewsResult.rows;
					var tips = tipsResult.rows;
					var sentiments = sentiment_analysis(reviews, food.toLowerCase());
					console.log(sentiments);
					//var count = 0;
					// console.log("num reviews affected: " + numReviews);
					// for (var i = 0; i < reviews.length; i++) {
					// 	count++
					// 	if (i < 10) {
					// 		console.log("businessName: " + reviews[i].NAME + ", review text: " + reviews[i].TEXT);
					// 	}
					// }
					// console.log("review count: " + count);
					connection.release(function(err) {
						if (err) {
							console.log(err);
							res.render('index');
						} 
						req.session.search_results = reviewsResult.rows;
						res.send(JSON.stringify({success: true, data: JSON.stringify(reviewsResult.rows)}));
					});
				});
			}
		});
	});
}

function sentiment_analysis(reviews, term) {

	var sentiments = [];
	var minSentiment = Number.NEGATIVE_INFINITY;
	var maxSentiment = Number.MAX_VALUE;
	for (review in reviews) {
		var text = reviews[review].TEXT;
		var sent = analyzeReview(text, term);
		sentiments.push(sent);
		if (sentiment < minSentiment) {
			minSentiment = sentiment;
		} 
		if (sentiment > maxSentiment) {
			maxSentiment = sentiment;
		}
	}
	var sum = 0;
	for (sent in sentiments) {
		sum += sentiments[sent];
	}
	var avg = sum/sentiments.length;
	var result = {"avg": avg, "min": minSentiment, "max":maxSentiment};
	return result;
}


function analyzeReview(review, searchTerm){
	console.log("text to search: " + review);
	var n=0, pos=0, sumSentiments = 0.0;
    var step = searchTerm.length;
    var length = review.length;

    while(true){
        pos = review.indexOf(review,pos);
        if (pos >= 0) { 
        	var lowPos = Math.min(0, pos - 30);
        	lowPos = (review.indexOf(" ", Math.max(0, pos-30))) 
        	var highPos = Math.min(length - 1, pos + 30);
        	var nextSpace = review.indexOf(" ", highPos);
        	if (nextSpace != -1) {
        		highPos = nextSpace;
        	}
        	var pSentiment = sentiment(review.substring(lowPos, highPos));
        	console.log("occurence sentiment: " + pSentiment);
        	sumSentiments += pSentiment;
            n++; 
        	pos+=step; 
        } else break;
    }
    return(sumSentiments/n);
}

exports.sentiment_analysis = function(req, res) {
	text = req.body.text;
	result = sentiment(text);
	res.send({result: result, success: true});
}