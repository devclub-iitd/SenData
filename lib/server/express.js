"use strict";
var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var env = require("./env");
function init() {
    var app = express();
    app.set('port', env.PORT);
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use('/css', express.static('css'));
    app.use('/js', express.static('js'));
    app.use('/images', express.static('images'));
    app.use('/fonts', express.static('fonts'));
    app.use(bodyParser.json());
    app.get('/', function (req, res) {
        res.sendFile(path.resolve(__dirname + '/../../index.html'));
    });
    return app;
}
module.exports = init;
