var express = require('express');
var bodyParser = require('body-parser');
var validator = require('validator'); //doc. @ https://github.com/chriso/validator.js
var app = express();
// See https://stackoverflow.com/questions/5710358/how-to-get-post-query-in-express-node-js
app.use(bodyParser.json());
// See https://stackoverflow.com/questions/25471856/express-throws-error-as-body-parser-deprecated-undefined-extended
app.use(bodyParser.urlencoded({ extended: true }));

// Mongo init
var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/where-in-the-world';
var mongo = require('mongodb');
var db = mongo.Db.connect(mongoUri, function(error, databaseConnection) {
	db = databaseConnection;
});

//POST location to 'collection'
app.post('/sendLocation', function(request, response) {
	response.header("Access-Control-Allow-Origin", "X-Requested-With");
	response.header("Access-Control-Allow-Origin", "*");

	var user = request.body.login;
	var getLat = request.body.lat;
	var getLng = request.body.lng;
	if (user != undefined && getLat != undefined && getLng != undefined){
		var userData = {
			"login": user,
			"lat": parseFloat(getLat),
			"lng": parseFloat(getLng),
			"created_at": new Date()
		};
		db.collection('locations', function(er, collection) {
			var id = collection.insert(userData, function(err, saved) {
				if (err) {
					response.send(500);
				}
				else {
					db.collection('locations', function(er, collection) {
						collection.find().limit(100).sort({"created_at":-1}).toArray(function(err, arrResult) {
							if (!err){
								response.send(JSON.stringify({"characters": [],"students": arrResult}));
							}else{
								response.send(500);
							}
						});
					});
				}
		    });
		});
	} else {
		response.send(500);
	}

});

//GET the JSON for the given login
app.get('/locations.json', function(request, response) {
	response.set('Content-Type', 'text/html');
	var userSearch = request.query.login;
	var userLog = [];
	response.header("Access-Control-Allow-Origin", "X-Requested-With");
	response.header("Access-Control-Allow-Origin", "*");
	db.collection('locations', function(er, collection) {
		collection.find().toArray(function(err, cursor) {
			if (!err && userSearch != undefined) {
				db.collection('locations', function(er, collection) {
					collection.find().sort({"created_at":-1}).toArray(function(err, arrResult) {
						for (var i = 0; i < arrResult.length; i++){
							if (arrResult[i].login == userSearch){
								userLog.push(arrResult[i]);
							}
						}
						if (!err && userLog.length != 0){
							response.send(JSON.stringify({"characters": [],"students": userLog}));
						}else{
							response.send('[]');
						}
					});
				});
			} else {
				response.send('[]');
			}
		});
	});
});

//GET for the home page
app.get('/', function(request, response) {
	response.set('Content-Type', 'text/html');
	var indexPage = '';
	db.collection('locations', function(er, collection) {
		collection.find().sort({"created_at":-1}).toArray(function(err, cursor) {
			if (!err) {
				indexPage += "<!DOCTYPE HTML><html><head><title>Where in the World?</title></head><body><h1>Where in the World?</h1>";
				for (var count = 0; count < cursor.length; count++) {
					indexPage += "<p>"+cursor[count].login+" was at "+cursor[count].lat+", "+cursor[count].lng+" as of "+cursor[count].created_at+"</p>";
				}
				indexPage += "</body></html>"
				response.send(indexPage);
			} else {
				response.send('<!DOCTYPE HTML><html><head><title>Where in the World?</title></head><body><h1>You have failed.</h1></body></html>');
			}
		});
	});
});

//GET the JSON for the MBTA Red Line
app.get('/redline.json', function(request, response) {
	//response.set('Content-Type', 'text/html');
	response.setHeader("Content-Type", "application/json");
	
	var http = require('http');
	var options = {
	  	host: 'developer.mbta.com',
  		port: 80,
	 	path: '/lib/rthr/red.json'
	};

	http.get(options, function(resp) {
	  	var data = '';
	  	//console.log("Got response: " + resp.statusCode);
	  	resp.on('data', function(chunk) {
	    	data += chunk;
	  	});
	  	resp.on('end', function() {
	    	response.send(data);
	  	});
	}).on('error', function(e) {
	  	//console.log("Got error: " + e.message);
	});
});

//http://stackoverflow.com/questions/15693192/heroku-node-js-error-web-process-failed-to-bind-to-port-within-60-seconds-of
app.listen(process.env.PORT || 3000);
