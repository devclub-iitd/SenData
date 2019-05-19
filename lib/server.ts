import http = require('http');
import express = require('./express');
import env = require('./env');

const app: Express.Application = express();
const server: http.Server = new http.Server(app);

server.listen(env.PORT);