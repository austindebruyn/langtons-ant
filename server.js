
var express 	= require('express');
var app 		= express();
app.use(express.static('public'));
app.use(require('body-parser').json());
app.set('view engine', 'jade');

var log = require('./services/LogService').boot({
	lowest: { console: 'debug', file: 'info' }
});

app.get('/', function (req, res) {
	return res.render('main');
});

var server 	= app.listen(3000);
log.note('Server listening on port %d.', 3000);
