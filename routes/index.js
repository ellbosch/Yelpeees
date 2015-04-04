
var moment = require('moment');
var sentiment = require('sentiment');
var ejs = require('ejs');
var oracledb = require('oracledb');
var dbconfig = require('../dbconfig.js')
var oracleConnectInfo = {user: dbconfig.user, password: dbconfig.password, connectString: dbconfig.connectString};
  // , fs = require('fs')
  // , wallTemplate = fs.readFileSync(__dirname + '/../views/wall.ejs', 'utf8')
  // , onlineTemplate = fs.readFileSync(__dirname + '/../views/online.ejs', 'utf8');

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
	// oracledb.getConnection(oracleConnectInfo, function(err, connection) {
	// 	if (err) {
	// 		console.log("Error connecting to oracle");
	// 	} else {
	// 		connection.execute(
	// 			"SELECT name "
	// 			+ "FROM businesses "
	// 			+ "WHERE ROWNUM < 5",
	// 			function(err, result) {
	// 				if (err) {
	// 					console.log(err);
	// 				} else {
	// 					console.log(result);
	// 					console.log(result.rows);
	// 					console.log(result.metaData);
	// 					res.render('index');
	// 				}
	// 			});

	// 		connection.release(function(err) {
	// 			if (err) {
	// 				console.log(err);
	// 			}
	// 		});
	// 	}
	// })
	res.render('index');
}

 exports.getReviews = function (req, res) {
	oracledb.getConnection(oracleConnectInfo, function(err, connection) {
		if (err) {
			console.log(err.stack);
		} else {
			console.log("restaurant: " + req.body.restaurant);
			var restaurant = req.body.restaurant;
			var businessSelect = "'%" + restaurant.toLowerCase() + "%'";
			connection.execute("SELECT B.name, B.address "
				+ 			   "FROM businesses B "
				+              "WHERE LOWER(B.name) LIKE " + businessSelect , function(err, result) {
				if (err) {
					console.log("error executing business query");
					console.log(err);
				} else {
					console.log("result: " + result.rows);
					connection.release(function(err) {
						if (err) {
							console.log(err);
						} else {
							res.send({success:true, data:result.rows})

						}
					});
				}
			});
		}
	});
}

exports.sentiment_analysis = function(req, res) {
	text = req.body.text;
	result = sentiment(text);
	res.send({result: result, success: true});
}