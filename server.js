/* configure access to our .env */
require("dotenv").config();

const { Client, ConsensusSubmitMessageTransaction, ConsensusTopicCreateTransaction, MirrorClient, MirrorConsensusTopicQuery } = require("@hashgraph/sdk");

const mirrorNodeAddress = new MirrorClient("hcs.testnet.mirrornode.hedera.com:5600");

const HederaClient = Client.forTestnet();

const myAccountId = process.env.MY_ACCOUNT_ID;
const myPrivateKey = process.env.MY_PRIVATE_KEY;

HederaClient.setOperator(myAccountId, myPrivateKey);
/* include express.js & socket.io, plus other packages */
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const open = require("open");

async function createNewTopic() {
  const txId = await new ConsensusTopicCreateTransaction().execute(HederaClient);

  await sleep(3000); /* wait for Hedera to reach consensus */
  
  const receipt = await txId.getReceipt(HederaClient);
  
  var newTopicId = receipt.getTopicId();
  
  console.log(`Your new topic was created with an ID = ${newTopicId}`);
  
  return newTopicId;
}

function sleep(ms) {

  return new Promise(resolve => setTimeout(resolve, ms));
  
  }
  
  var newTopicId = "";

  async function init() {

    newTopicId = await createNewTopic();
    
    await sleep(9000); /* wait for our new topic to reach a Mirror Node */
    
    runChat(); /* handoff to runChat() here instead of at the end of the file */
    
    }

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
      try {

        new ConsensusSubmitMessageTransaction().setTopicId(newTopicId).setMessage(msg).execute(HederaClient);
        
        console.log("ConsensusSubmitMessageTransaction", msg);
        
        }
        
        catch (error) {
        
        console.log("ERROR: ConsensusSubmitMessageTransaction", error);
        
        }
        
        });
        const TextDecoder = require("text-encoding").TextDecoder;


      try {

      new MirrorConsensusTopicQuery().setTopicId(newTopicId).subscribe(mirrorNodeAddress, response => {

      /* use a node.js package to decode our text responses */

      var postHCSMessage = new TextDecoder("utf-8").decode(response["message"]);

      /* send responses from our Hedera Mirror Node back to our Socket.io clients */

      io.emit("chat message", postHCSMessage);

      });

      }

      catch(error) {

      console.log("ERROR: MirrorConsensusTopicQuery()", error);

      }

    /* send messages when new clients disconnect */
    client.on("disconnect", function() {
      io.emit("disconnect message", client.id);
    });
  });
}
init(); 