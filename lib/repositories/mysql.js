var doorserver = require('../doorserver');
var mysql = require('mysql');

var handle = {};

exports.fetchHandle = function(endpoint, cb) {
  if (handle[endpoint]) {
    cb(null, handle[endpoint]);
    return;
  }

  if (doorserver.settings.get("mysql")[endpoint] === undefined) {
    throw new Error("Invalid database endpoint name", endpoint);
  }

  handle[endpoint] = mysql.createClient(doorserver.settings.get("mysql")[endpoint]);
  handle[endpoint].query("SELECT 1", function (err, response) {
    if (err) {
      console.error("Error on obtaining mysql connection", err);
      return;
    }

    cb(null, handle[endpoint]);
  });
};

