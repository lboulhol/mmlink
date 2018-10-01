const mysql = require('mysql');
const http = require('http');
const conf = require('./conf/conf.json');
const params = require('./conf/params.json')[conf.env];

const db = mysql.createConnection({
	host: params.sql.host,
	user: params.sql.user,
	password: params.sql.pass,
	database: params.sql.db,
});

answer = function(req, res) {
	const { headers, method, url } = req;

	if(headers["authorization"] != params.authorization) {
		res.statusCode = 401;
		res.end(JSON.stringify({
			error: "Unauthorized",
		}));
		return;
	}

	const urlComps = url.split('/');
	const objectType = urlComps[1];
	const objectId = urlComps[2];

	switch(method) {
		case "GET":
			getMml(objectType,objectId,res);
		break;
		case "POST":
			let bodyPost = [];
			req.on('error', function(err) {
				console.error(err);
			}).on('data', function(chunk) {
				bodyPost.push(chunk);
			}).on('end', function() {
				try {
					var jsonBody = JSON.parse(Buffer.concat(bodyPost).toString());
					postMml(objectType,jsonBody,res);
				}
				catch(e) {
					console.log(e);
				}
			});
		break;
		case "PUT":
			let bodyPut = [];
			req.on('error', function(err) {
				console.error(err);
			}).on('data', function(chunk) {
				bodyPut.push(chunk);
			}).on('end', function() {
				try {
					var jsonBody = JSON.parse(Buffer.concat(bodyPut).toString());
					putMml(objectType,objectId,jsonBody,res);
				}
				catch(e) {
					console.log(e);
				}
			});
		break;
		default:
			res.end("Not supported.");
		break;
	}
}

getMml = function(objectType,objectId,res) {
	if(params.sql.authorizedTables.indexOf(objectType) == -1) {
		res.end(JSON.stringify({
			"Error": "Unauthorized table"
		}));
	}
	else {
		db.query("SELECT * FROM " + objectType + " WHERE id=?", [objectId], function(err,result,fields) {
			if(err) {
				console.log(err);
				res.end(JSON.stringify({
					"SQL Error": err
				}));
			}
			else if(result[0]) {
				res.end('{"' + objectType + '": ' + JSON.stringify(result[0]) + '}');
			}
			else {
				res.end(JSON.stringify({}));				
			}
		});
	}
}

postMml = function(objectType,json,res) {
	if(params.sql.authorizedTables.indexOf(objectType) == -1) {
		res.end(JSON.stringify({
			"Error": "Unauthorized table"
		}));
	}
	else {
		var stringKeys = db.escape(Object.keys(json)).replace(/\'/g,'`');
		db.query("INSERT INTO " + objectType + " (" + stringKeys + ") VALUES (?) ", [Object.values(json)], function(err,result,fields) {
			if(err) {
				console.log(err);
				res.end(JSON.stringify({
					"SQL Error": err
				}));
			}
			else {
				db.query("SELECT * FROM " + objectType + " WHERE id=?", [result.insertId], function(err,result,fields) {
					if(err) {
						console.log(err);
						res.end(JSON.stringify({
							"SQL Error": err
						}));
					}
					else if(result[0]) {
						res.end('{"' + objectType + '": ' + JSON.stringify(result[0]) + '}');
					}
					else {
						res.end(JSON.stringify({}));				
					}
				});			
			}
		});
	}
}

putMml = function(objectType,objectId,json,res) {
	if(params.sql.authorizedTables.indexOf(objectType) == -1) {
		res.end(JSON.stringify({
			"Error": "Unauthorized table"
		}));
	}
	else {
		db.query("UPDATE " + objectType + " SET ? WHERE id=? ", [json,objectId], function(err,result,fields) {
			if(err) {
				console.log(err);
				res.end(JSON.stringify({
					"SQL Error": err
				}));
			}
			else {
				db.query("SELECT * FROM " + objectType + " WHERE id=?", [objectId], function(err,result,fields) {
					if(err) {
						console.log(err);
						res.end(JSON.stringify({
							"SQL Error": err
						}));
					}
					else if(result[0]) {
						res.end('{"' + objectType + '": ' + JSON.stringify(result[0]) + '}');
					}
					else {
						res.end(JSON.stringify({}));				
					}
				});			
			}
		});
	}
}

const server = http.createServer(answer);

server.listen(params.http.port, function() {
	console.log("Listening on " + params.http.port + "...");
});