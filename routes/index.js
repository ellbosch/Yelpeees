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

function getCloseBusinesses(rows, location, callback) {
	var result = [];
	var count = 0;
	var check = rows.length;
	for (var i = 0; i < rows.length; i++) {
		(function(row) {
			within10Miles(rows[row], location, function(err, isClose) {
				if (err) {
					console.log(err);
					callback(err, null);
				} else {
					if (isClose) {
						result.push(rows[row]);
						if (row == rows.length - 1) {
							callback(null, result);
						}
					} else {
						if (row == rows.length - 1) {
						callback(null, result);
						}
					}
				}
			});
		})(i);
	}
}

function within10Miles(row, loc2, callback) {
	var loc1 = row[3] + ", " + row[4];
	gm.distance(loc1, loc2, function(err, distanceData) {
		if (err) {
			callback(err, null);
		} else {
			if (!distanceData || distanceData.rows[0].elements[0].status != "OK") {
				callback(null, false);
			} else {
				// TEMPORARY 1000 mile radius until db fully loaded
				callback(null, parseFloat(distanceData.rows[0].elements[0].distance.text.split(" ")[0].replace(/,/g, '')) < 1609.34);
			}
		}
	});
}

exports.getBusinesses = function (req, res) {
	console.log("getting businesses");
	var bizName = req.body.restaurant;
	var location = req.body.location;
	console.log("name: " + bizName + " location: " + location);
	oracledb.getConnection(oracleConnectInfo, function(err, connection) {
		if (err) {
			console.log(err.stack);
		} else {
			var sqlBizName = "'%" + bizName.toLowerCase() + "%'";
			connection.execute("SELECT * "
				+			   "FROM businesses B "
				+              "WHERE LOWER(B.name) LIKE " + sqlBizName, function(err, result) {

				if (err) {
					console.log("error fetching matching business query");
					res.send({success:false});
				}	else {
					var rows = result.rows;
					getCloseBusinesses(rows, location, function(err, closeOnes) {
						if (err) {
							console.log(err);
						} else {
							console.log(closeOnes);
							res.send({success:true, businesses:closeOnes.slice(0, Math.min(10, closeOnes.length - 1))});
						}
					});
				}

			});
		}
	});
}

exports.getReverseGeocode = function(req, res) {
	var coords = req.body.coords;

	gm.reverseGeocode(coords, function(err, data){
		if (err) {
			throw err;
		}
	  	var ad = data.results[0].formatted_address;
	  	var zip = get_zipcode(ad);
	  	res.send(JSON.stringify({zipcode: zip, address: ad}));
	});
}

// get zipcode from address
function get_zipcode(ad) {
	var zip = "";
	var ad_split = ad.split(" ");
  	if (ad_split.length > 2) {
	  	var zip_untrim = ad_split[ad_split.length - 2];
	  	if (zip_untrim.length == 6) {
		  	zip = zip_untrim.substring(0, zip_untrim.length - 1);
		}
	}
	return zip;
}

exports.getGeocode = function(req, res) {
	var address = req.body.address;

	gm.geocode(address, function(err, data){
		if (err) {
			throw err;
		}
		var location = data.results[0].geometry.location;
		var zip = get_zipcode(data.results[0].formatted_address);
		res.send(JSON.stringify({lat: location.lat, lng: location.lng, zipcode: zip}));
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
					var result = [];
					var i, j, count = 0;
					console.log("starting to search the reviews");
					while (i < reviews.length && j < tips.length) {
						console.log("populating results");
						var name = reviews[i].NAME;
						var address = reviews[i].ADDRESS;
						count = 0;
						while (reviews[i].BUSINESS_ID == firstId) {
							console.log("looping through reviews");
							reviewSet.push(reviews[i].TEXT);
							i++;
							count++;
						}
						while (j < tips.length && tips[j].BUSINESS_ID == firstId) {
							reviewSet.push(tips[j].TEXT);
							j++;
							count++;
						}
						if (reviewSet.length > 0) {
							result.push(JSON.stringify({"business_name":name, "address":address, "rating":sentiment_analysis(reviewSet, food.toLowerCase()), "num_reviews":count}));
						}
						if (i < reviews.length) {
							firstId = reviews[i].BUSINESS_ID;
						}
					}	
					
					connection.release(function(err) {
						if (err) {
							console.log(err);
							res.render('index');
						} 
						req.session.search_results = reviewsResult.rows;
						res.send(JSON.stringify({success: true, data: result}));
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
		var text = reviews[review];
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