"use strict";
exports.__esModule = true;
var peer_1 = require("peer");
var express = require("express");
var path = require("path");
var app = express();
var server = app.listen(3000);
var peerserver = peer_1.ExpressPeerServer(server);
app.get('/', function (req, res) {
    res.sendFile(path.join('../web/index.html'));
});
peerserver.on('connection', function (id) {
    console.info('connected > ', id);
});
peerserver.on('disconnect', function (id) {
    console.info('disconnected > ', id);
});
