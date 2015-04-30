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

exports.index = function(req, res) {
	res.render('index');
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


function getBusinessInfo(businessId, callback) {
	oracledb.getConnection(oracleConnectInfo, function(err, connection) {
		if (err) {
			console.log("error connecting to db");
			callback(err, null);
		} else {
			connection.execute("SELECT B.name, B.address FROM businesses B WHERE business_id = " + "'" + businessId + "'", 
				function(err, result) {
					var info = result.rows;
					callback(null, info[0]);
			});
		}
	});
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

exports.getGeocode = function(req, res) {
	var address = req.body.address;

	gm.geocode(address, function(err, data){
		if (err) {
			throw err;
		}
		var location = data.results[0].geometry.location;
		var zip = getZipcode(data.results[0].formatted_address);
		res.send(JSON.stringify({lat: location.lat, lng: location.lng, zipcode: zip}));
	});
}



exports.getReviewsAndRating = function (req, res) {
	oracledb.getConnection(oracleConnectInfo, function(err, connection) {
		if (err) {
			console.log(err.stack);
		}
		var restaurantId = req.body.businessId;
		req.session.business_id = restaurantId;
		var food = req.body.food;
		var sqlRestaurant = "'" + restaurantId + "'";
		var sqlFood = "'%" + food.toLowerCase() + "%'";
		//var userId = req.session.userid;
		var userId = 1;
		updateUserHistory(userId, restaurantId, food, function(err, success) {
			if (err) {
				console.log(err);
				res.send({success:false, message: "Error updating user history. Please try again"});
			} else {
				connection.execute("SELECT R.text, R.stars, R.rdate "
					+ 			   "FROM reviews R "
					+              "WHERE R.business_id = " + sqlRestaurant + " AND LOWER(R.text) LIKE " + sqlFood

									, function(err, reviewsResult) {
					if (err) {
						console.log("error executing reviews query");
						console.log(err);
						res.send({success:false, message: "Error querying the database for that food item. Please try again."});
					} else {
						connection.execute("SELECT T.text, T.tdate "
					+ 			   "FROM tips T "
					+              "WHERE T.business_id = " + sqlRestaurant + " AND LOWER(T.text) LIKE " + sqlFood
								, function(err, tipsResult) {
							if (err) {
								console.log(err);
								res.send({success:false, message: "Error querying the database for that food item. Please try again."});
							} else {
								var reviews = reviewsResult.rows;
								var tips = tipsResult.rows;
								console.log(tips);
								var result = [];
								var reviewTexts = [];
								var sumStars = 0;
								if (reviews.length == 0) {
									res.send({success:false, message: "There were no reviews that matched your query. Please try another food item."});
								} else {
									for (var i = 0; i < reviews.length; i++) {
										reviewTexts.push(reviews[i][0]);
										console.log(reviews[i][1]);
										sumStars += parseInt(reviews[i][1]);
										if (i == reviews.length - 1) {
											if (tips.length == 0) {
												console.log(reviewTexts);
												var result = JSON.stringify({reviews:reviewTexts, sentiment:sentimentAnalysis(reviewTexts, food), avgStars:sumStars/reviews.length});
												console.log(result);
												res.send(JSON.stringify({success: true, data: result}));
											} else {
												for (var j = 0; j < tips.length; j++) {
													console.log("populating tips");
													reviewTexts.push(tips[j][0]);
													if (j == tips.length - 1) {
														connection.release(function(err) {
															if (err) {
																console.log("error releasing db connection in getReviewsAndRating");
																console.log(err);
																res.send({success:false, message: "Error querying the database for that food item. Please try again."});
															} else {
																var result = {reviews:reviewTexts, sentiment:sentimentAnalysis(reviewTexts, food), avgStars:sumStars/reviews.length};
																console.log(result);
																res.send(JSON.stringify({success: true, data: result}));
															}
														});
													}
												}
											}
										}
									}
								}
							}
						});
					}
				});
			}
		});

	});
}


exports.getReverseGeocode = function(req, res) {
	var coords = req.body.coords;

	gm.reverseGeocode(coords, function(err, data){
		if (err) {
			throw err;
		}
	  	var ad = data.results[0].formatted_address;
	  	var zip = getZipcode(ad);
	  	res.send(JSON.stringify({zipcode: zip, address: ad}));
	});
}

// get zipcode from address
function getZipcode(ad) {
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


exports.populateSearchResults = function(req, res) {
	if (! req.session.search_results) {
		res.render('/');
	}
	else {
		res.render('search', {results: JSON.stringify(req.session.search_results)});
	}
}

function sentimentAnalysis(reviews, term) {

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


function updateUserHistory(userId, businessId, food, callback) {
	oracledb.getConnection(oracleConnectInfo, function(err, connection) {
		if (err) {
			console.log(err.stack);
			callback(err, null);
		} else {
			connection.execute("INSERT INTO history (userid, food_item, business_id) "
						+ 		"VALUES ('" + userId + "', '" + food + "', '" + businessId + "')" 
							, function(err, result) {
				if (err) {
					callback(err, null);
				}	else {
					callback(null, {success:true});
				}				

			});
		}
	});
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
