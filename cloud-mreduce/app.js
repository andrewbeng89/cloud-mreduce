
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , url = require('url');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.enable("jsonp callback");
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var mongoose = require('mongoose'), question = require('./models/question');
mongoose.connect('mongodb://cloud-mreduce:cloudmr123@ds053317.mongolab.com:53317/cloud-mreduce');

app.get('/', function(req, res) {
	res.jsonp({hello:'world'});
});
app.get('/users', user.list);

app.get('/questions', function(req, res) {
	var _get = url.parse(req.url, true).query;
	var question_id = _get['id'];
	question.findOne({
		question_id : question_id
	}, function(err, selected_question) {
		if (err) {
			res.jsonp("error");
		}
		
		// Requested question found
		if (selected_question !== null) {
			// Returns question
			res.jsonp(selected_question);
		} else {
			res.jsonp("not found");
		}
	});
});

app.get('/verify', function(req, res) {
	var _get = url.parse(req.url, true).query;
	var question_id = _get['q_id'];
	var lang = _get['lang'];
	var solution = _get['solution'];
	question.findOne({
		question_id : question_id
	}, function(err, selected_question) {
		if (err) {
			res.jsonp("error");
		}
		
		// Requested question found
		if (selected_question !== null) {
			// Returns question
			var data = {
				"solution":solution,
				"tests": (lang === 'js') ? selected_question.js_tests : selected_question.py_tests
			};
			var verified_results = '';
			var options = {
				host : 'ec2-54-251-193-188.ap-southeast-1.compute.amazonaws.com',
				path : '/' + lang + '?jsonrequest=' + new Buffer(JSON.stringify(data)).toString('base64'),
				method : 'GET'
			};
			res.set('Content-Type', 'application/json');
			http.get(options, function(response) {
				console.log("Got response: " + response.statusCode);

				response.on("data", function(chunk) {
					verified_results += chunk.toString();
				});

				response.on("end", function() {
					res.jsonp(JSON.parse(verified_results));
					//res.jsonp(selected_question.js_tests);
				});
			}).on('error', function(e) {
				console.log("Got error: " + e.message);
			});
		} else {
			res.jsonp("not found");
		}
	});
});

app.get('/total_questions', function(req, res) {
	question.find(
        {},
        function(err, docs) {
        	if (!err){ 
            	res.jsonp({number:docs.length});
            } else {
				throw err;
			}
		}
    );
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
