"use strict";
exports.__esModule = true;
var peer_1 = require("peer");
var express = require("express");
var path = require("path");
var WEB_ROOT = path.resolve(__dirname, '../web');
var app = express();
var server = app.listen(3000);
var peerserver = peer_1.ExpressPeerServer(server);
app.use('/peer', peerserver);
app.use('/assets', express.static(path.join(WEB_ROOT, 'assets')));
app.get('/', function (req, res) {
    res.sendFile(path.join(WEB_ROOT, 'index.html'));
});
peerserver.on('connection', function (id) {
    console.info('connected > ', id);
});
peerserver.on('disconnect', function (id) {
    console.info('disconnected > ', id);
});
