$(function() {
  // expose our socket client
  const socket = io();

  // handle and submit new chat messages to our server
  if ($("#m").val() !== "") {
    $("#form").submit(function(e) {
      e.preventDefault(); // prevents page reloading
      const msg = $("#m").val();
      socket.emit("chat message", msg);
      $("#m").val("");
      return false;
    });
  }

  // submit transfer request to server
  $("#transfer-form").submit(function(e) {
    e.preventDefault(); // prevents page reloading
    const msgAsJson = {
      sourceId: $("#source-id").val(),
      destinationId: $("#destination-id").val(),
      amount: $("#amount").val()
    }
    socket.emit("transfer", {
      sourceId: $("#source-id").val(),
      destinationId: $("#destination-id").val(),
      amount: $("#amount").val()
    });
    $("#amount").val("");
    return false;
  });

  // listen for new chat messages from our server
  // these are all sent over the Hedera consensus service!
  socket.on("chat message", function(msg) {

    const jsonMsg = JSON.parse(msg);
    console.log(jsonMsg);

    // Grab the specifically formatted message string
    const operatorId = jsonMsg.operatorAccount;
    const clientId = jsonMsg.client;
    const theMessage = jsonMsg.message;
    const sequenceNumber = jsonMsg.sequence;
    const trimmedHash = "runningHash: " + jsonMsg.runningHash.slice(0,6) + "..";
    const trimmedTimestamp = jsonMsg.timestamp.slice(0,25);

    // Grab & trim our topic ID
    const topicId = document.getElementById("topic-id");
    const balance = document.getElementById("balance");
    const idString = topicId.innerHTML.substring(7, topicId.length);

    // Append the message to our HTML in pieces
    $("#messages").append(
      $("<li>").addClass("new-message").append(
        $("<div>").addClass("message").append(
          $("<p>").text(operatorId+"@"+clientId).addClass("client")).append(
            $("<div>").addClass("message-body").append(
              $("<div>").text(theMessage).addClass("message-content")).append(
              $("<div>").text(trimmedTimestamp).addClass("message-timestamp")))).append(
        $("<div>").addClass("meta").append(
          $("<p>").text("sequence: "+ sequenceNumber).addClass("details")).append(
          $("<p>").text(trimmedHash).addClass("details")).append(
          $("<a>").text("view transaction").addClass("details")
            .attr("target", "_blank")
            .attr("href", `https://explorer.kabuto.sh/testnet/topic/${idString}/message/${sequenceNumber}`))));

    // Update the current sequence #
    $("#sequence-number").text("last message sequence number: " + sequenceNumber + "  ");
  });

  // listen for new client connections from our server
  socket.on("connect message", function(msg) {
    /* send new connection message */
    const connectMessage = JSON.parse(msg)
    
    console.log(connectMessage);
    
    $("#messages").append(
      $("<li>").text('new connection: ' + connectMessage.operatorAccount + "@" + connectMessage.client).addClass("new-connection"));
    /* update this clients topic id */
    const topicId = document.getElementById("topic-id");
    const balance = document.getElementById("balance");
    topicId.innerHTML = "Topic: " + connectMessage.topicId;
    balance.innerHTML = "Balance: " + connectMessage.balance;
  });

  // listen for client disconnections from our server
  socket.on("disconnect message", function(msg) {
    /* send new disconnection message */
    const disconnectMsg = JSON.parse(msg);
    $("#messages").append(
      $("<li>").text(disconnectMsg.operatorAccount + "@" + disconnectMsg.client + ' has disconnected').addClass("disconnection"));
  });
  
  socket.on("transfer message", function(msg) {
    /* send new transfer message */
    console.log("The received message: " + msg);
    
    const transferMsg = JSON.parse(msg);
    $("#messages").append(
      $("<li>").text(JSON.stringify(transferMsg)));
      
    const balance = document.getElementById("balance");
    balance.innerHTML = "Balance: " + transferMsg.balance;
  });
});
