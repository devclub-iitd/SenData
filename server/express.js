"use strict";
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const env = require("./env");
function init() {
    const app = express();
    app.set('port', env.PORT);
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use('/css', express.static('css'));
    app.use('/js', express.static('js'));
    app.use('/images', express.static('images'));
    app.use('/fonts', express.static('fonts'));
    app.use(bodyParser.json());
    app.get('/', (req, res) => {
        res.sendFile(path.resolve(__dirname + '/../index.html'));
    });
    return app;
}
module.exports = init;
