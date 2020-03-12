/* configure access to our .env */
require("dotenv").config();

/* include express.js & socket.io, plus other packages */
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const open = require("open");

function runChat() {
  /* serve our /public folder, which includes our frontend html */
  app.use(express.static("public"));

  /* serve the app at a random port location */
  http.listen(0, function() {
    const randomInstancePort = http.address().port;
    open("http://localhost:" + randomInstancePort);
  });

  /* when a new socket.io client connects to this server */
  io.on("connection", function(client) {

    /* send messages when new clients connect */
    io.emit("connect message", client.id);
    
    /* send chat messages to all listening clients */
    client.on("chat message", function(msg) {
      io.emit("chat message", msg);
    });
    
    /* send messages when new clients disconnect */
    client.on("disconnect", function() {
      io.emit("disconnect message", client.id);
    });
  });
}

runChat();