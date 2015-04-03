
var moment = require('moment');
var sentiment = require('sentiment');
var ejs = require('ejs');
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
	res.render('index');
}

exports.sentiment_analysis = function(req, res) {
	text = req.body.text;
	result = sentiment(text);
	res.send({result: result, success: true});
}