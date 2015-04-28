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

var within10miles = function (lat1, long1, lat2, long2) {
	gm.distance(lat1 + "," + long1, lat2 + "," + long2, function(err, data) {
		if (err) {
			throw err;
		}
		if(parseFloat(data.rows[0].elements[0].distance.text.split(" ")[0]) < 16.0934) {
			// within 10 miles
		}
	});
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
			+              "WHERE B.business_id = R.business_id AND LOWER(B.name) LIKE " + sqlRestaurant + " AND LOWER(R.text) LIKE " + sqlFood
			+              " ORDER BY B.business_id" , 

							{}, {outFormat: oracledb.OBJECT}, function(err, reviewsResult) {
			if (err) {
				console.log("error executing business query");
				console.log(err);
			} 
			else {
				connection.execute("SELECT B.name, B.address, T.text, T.tdate "
			+ 			   "FROM businesses B, tips T "
			+              "WHERE B.business_id = T.business_id AND LOWER(B.name) LIKE " + sqlRestaurant + " AND LOWER(T.text) LIKE " + sqlFood
			+ 			   " ORDER BY B.business_id" , 

							{}, {outFormat: oracledb.OBJECT}, function(err, tipsResult) {

					var reviews = reviewsResult.rows;
					var tips = tipsResult.rows;
					var firstId = reviews[0].BUSINESS_ID;
					var reviewSet = [];
					var sentimentSet = [];
					var i = 0;
					while (i < reviews.length) {
						while (reviews[i].BUSINESS_ID == firstId) {
							reviewSet.push(reviews[i].TEXT);
							i++;
						}
						if (reviewSet.length > 0) {
							sentimentSet.push(sentiment_analysis(reviewSet, food.toLowerCase()));
						}
						
					}	
					

					var sentiments = sentiment_analysis(reviews, food.toLowerCase());
					console.log(sentiments);
					
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
	var minSentiment = Number.MAX_VALUE;
	var maxSentiment = Number.NEGATIVE_INFINITY;
	for (review in reviews) {
		var text = reviews[review].TEXT;
		var sent = analyzeReview(text, term);
		sentiments.push(sent);
	}
	var sum = 0;
	for (sent in sentiments) {
		sum += sentiments[sent];
		if (sentiments[sent] < minSentiment) {
			minSentiment = sentiments[sent];
		} 
		if (sentiments[sent] > maxSentiment) {
			maxSentiment = sentiments[sent];
		}
	}
	var avg = sum/sentiments.length;
	return {"avg": avg, "min": minSentiment, "max":maxSentiment};
}


function analyzeReview(review, searchTerm){
	var n=0, pos=0, sumSentiments = 0.0;
    var step = searchTerm.length;
    var length = review.length;

    while(true){
        pos = review.indexOf(searchTerm,pos);
        if (pos >= 0) { 
        	var lowPos = Math.min(0, pos - 30);
        	lowPos = (review.indexOf(" ", Math.max(0, pos-30))) 
        	var highPos = Math.min(length - 1, pos + 30);
        	var nextSpace = review.indexOf(" ", highPos);
        	if (nextSpace != -1) {
        		highPos = nextSpace;
        	}
        	var pSentiment = sentiment(review.substring(lowPos, highPos));
        	sumSentiments += parseFloat(pSentiment.score);
            n++; 
        	pos+=step; 
        } else break;
    }
    console.log("sum sentiments: " + sumSentiments);
    console.log("n: " + n);
    console.log("average sentiment: " + sumSentiments/n);
    var avg = (n == 0) ? 0 : sumSentiments/n;
    return avg;
}

exports.sentiment_analysis = function(req, res) {
	text = req.body.text;
	result = sentiment(text);
	res.send({result: result, success: true});
}