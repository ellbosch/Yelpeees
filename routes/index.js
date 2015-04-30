var moment = require('moment');
var sentiment = require('sentiment');
var ejs = require('ejs');
var oracledb = require('oracledb');
var dbconfig = require('../dbconfig.js')
var oracleConnectInfo = {user: dbconfig.user, password: dbconfig.password, connectString: dbconfig.connectString};
var gm = require('googlemaps');
var crypto = require('crypto');


// // We export the init() function to initialize
// // our KVS values


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
    var avg = (n == 0) ? 0 : sumSentiments/n;
    return avg;
}

exports.init = function(callback) {
	callback();
};

exports.index = function(req, res) {
	if (req.session.userid) {
		getHistory(req.session.userid, function(err, history) {
			if (err) {
				console.log(err);
				res.render('index', {loggedIn:true, userName:'', history:[]});
			} else {
				res.render('index', {loggedIn:true, userName:'', history:history});
			}
		});
	} else {
		res.render('index', {loggedIn:false, userName:'', history: []});
	}
}

exports.login = function(req, res) {
	res.render('login', {error: ""});
}

exports.signup = function(req, res) {
	res.render('signup', {error: ""});
}

exports.createAccount = function(req, res) {

	if (req.body.username && req.body.password && req.body.firstname &&
				req.body.lastname && req.body.email) {

		oracledb.getConnection(oracleConnectInfo, function(err, connection) {
			if (err) {
				console.log(err.stack);
				res.render("signup", {error: "Error connecting to the database. Sorry, please try again"});
				return;
			}
			connection.execute("SELECT * "
					+		   "FROM users U "
					+          "WHERE U.username = :username", ["'" + req.body.username + "'"], function(err, result) {

				if (err) {
					console.log("error fetching username count from users table: createAccount()");
					res.render("signup", {error: "Error connecting to the database. Sorry, please try again"});
					return;
				}	
				if (result.rows.length > 0) {
					res.render("signup", {error: "The inputted username already exists. Please try again with another username"});
					return;
				}
				connection.execute("SELECT count(*) AS count "
						+		   "FROM users U", function(err, result) {
					if (err) {
						console.log(err);
						console.log("Error inserting user into db: createAccount()");
						res.render("signup", {error: "Error connecting to the database. Sorry, please try again"});
						return;
					}
					var userid = parseInt(result.rows[0]) + 1;
					var encrypter = crypto.createHash('sha1');
					encrypter.update(req.body.password);
					var encrypted_password = encrypter.digest('base64');
					connection.execute("INSERT INTO users VALUES (:username, :password, :firstname, :lastname, :email, :userid)" ,
							["'" + req.body.username.substring(0, 50) + "'", "'" + encrypted_password + "'", 
							"'" + req.body.firstname.substring(0, 50) + "'", "'" + req.body.lastname.substring(0, 50) + "'", 
							"'" + req.body.email.substring(0, 50) + "'", userid], {isAutoCommit: true}, function(err, result) {
						if (err) {
							console.log(err);
							console.log("Error inserting user into db: createAccount()");
							res.render("signup", {error: "Error connecting to the database. Sorry, please try again"});
							return;
						}
						

						connection.release(function(err) {
							if (err) {
								console.log(err);
								res.render("signup", {error: "Error connecting to the database. Sorry, please try again"});
								return;
							} 
							req.session.username = req.body.username;
							req.session.userid = userid;
							res.redirect("/");
							return;
						});
					});
				});
				
			});
		});
	}
	else {
		res.render("signup", {error: "Please fill out all the form entries and resubmit"});
		return;
	}
}

// // We export the init() function to initialize
// // our KVS values
exports.init = function(callback) {
	callback();
};

exports.getBusinesses = function (req, res) {
	console.log("getting businesses");
	var bizName = req.body.restaurant;
	var location = req.body.location;
	oracledb.getConnection(oracleConnectInfo, function(err, connection) {
		if (err) {
			console.log(err.stack);
		} else {
			var sqlBizName = "'%" + bizName.toLowerCase().replace(/[^\w\s\']/g, '').replace(/'/g, "''") + "%'";
			connection.execute("SELECT * "
				+			   "FROM businesses B "
				+              "WHERE REGEXP_REPLACE(LOWER(B.name), '/[^\w\s]/g', '') LIKE " + sqlBizName, function(err, result) {

				if (err) {
					console.log("error fetching matching business query");
					console.log(err);
					res.send({success:false});
				}	else {
					var rows = result.rows;
					getCloseBusinesses(rows, location, function(err, closeOnes) {
						if (err) {
							console.log(err);
						} else {
							//console.log("sending back businesses: " + closeOnes);
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
	if (rows.length == 0) {
		callback(null, []);
	} else {
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
		var userId = req.session.userid;
		updateUserHistory(connection, userId, restaurantId, food, function(err, success) {
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

function getHistory(userId, callback) {
	oracledb.getConnection(oracleConnectInfo, function(err, connection) {
		connection.execute("SELECT * FROM history H WHERE H.userid = :userid ORDER BY H.time desc", [userId], function(err, result) {
			if (err) {
				console.log("getHistory()");
				console.log(err);
				callback(err, null);
			} else {
				var rows = result.rows;
				connection.release(function(err) {
					if (err) {
						console.log("error getting history: " + err);
						callback(err, null);
					} else {
						console.log(rows);
						callback(null, rows.slice(Math.min(10, rows.length - 1)));
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

exports.login = function(req, res) {
	res.render('login', {error: ""});
}

exports.logout = function(req, res) {
	req.session.userid = null;
	res.redirect('/');
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

exports.signup = function(req, res) {
	res.render('signup', {error: ""});
}


function updateUserHistory(connection, userId, businessId, food, callback) {
	connection.execute("SELECT name FROM businesses WHERE business_id = " + "'" + businessId + "'", function(err, result) {
		if (err) {
			console.log(err);
			callback(err, null);
		} else {
			var rows = result.rows;
			if (rows.length == 1) {
				var name = rows[0][0];
				var time = (new Date).getTime();				
				connection.execute("INSERT INTO history VALUES (:userid, :food_item, :business_id, :name, :time)",
						[userId, food, businessId, name, time], {isAutoCommit: true}, function(err, result) {
					if (err) {
						console.log("error updating user history");
						callback(err, null);
					}	else {
						callback(null, {success:true});
					}
				});
			} else {
				console.log("no business name");
				callback(1, null);
			}
		}
	});
}

exports.validateUser = function(req, res) {
	if (req.body.username && req.body.password) {
		var username = req.body.username;
		oracledb.getConnection(oracleConnectInfo, function(err, connection) {
			if (err) {
				console.log(err.stack);
				res.render("login", {error: "Error connecting to the database. Sorry, please try again"});
				return;
			}
			connection.execute("SELECT *"
					+		   "FROM users U "
					+          "WHERE U.username = :username", ["'" + req.body.username + "'"], function(err, result) {
				if (err) {
					console.log("error fetching username count from users table: createAccount()");
					res.render("login", {error: "Error connecting to the database. Sorry, please try again"});
					return;
				}	

				if (result.rows.length == 0) {
					res.render("login", {error: "Invalid username"});
					return;
				}
				var encrypter = crypto.createHash('sha1');
				encrypter.update(req.body.password);
				var encrypted_password = encrypter.digest('base64');
				if (result.rows[0][1] == "'" + encrypted_password + "'") {
					req.session.username = username;
					req.session.userid = result.rows[0][5];
					res.redirect("/");
					return;
				}
				else {
					res.render("login", {error: "Invalid password"});
					return;
				}
			});
		});
	}
	else {
		res.render("login", {error: "Empty fields presents. Please make sure to fill out all the fields"});
		return;
	}
}


function within10Miles(row, loc2, callback) {
	var loc1 = row[3] + ", " + row[4];
	gm.distance(loc1, loc2, function(err, distanceData) {
		if (err) {
			callback(err, null);
		} else {
			if (!distanceData || distanceData.rows.length == 0 || distanceData.rows[0].elements[0].status != "OK") {
				callback(null, false);
			} else {
				// TEMPORARY 1000 mile radius until db fully loaded
				callback(null, parseFloat(distanceData.rows[0].elements[0].distance.text.split(" ")[0].replace(/,/g, '')) < 1609.34);
			}
		}
	});
}
