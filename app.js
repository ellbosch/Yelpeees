/**
 *
 */

var express = require('express');
var routes = require ('./routes');
var http = require('http');
var path = require('path');
var app = express();
var engine = require('ejs-locals');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');

app.set('port', process.env.PORT || 8080);
app.engine('ejs', engine);
app.set('views', path.join( __dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true }));
app.use(bodyParser.json());
app.use( express.static( path.join( __dirname, 'public' )));

app.use(cookieParser());
// TODO: update this with your PennKey
app.use(session({secret: 'mypennkeygoeshere'}));

routes.init(function() {
	app.get( '/', routes.index );
	/////////////////////

	http.createServer( app ).listen( app.get( 'port' ), function(){
		console.log( 'Open browser to http://localhost:' + app.get( 'port' ));
	});
});

