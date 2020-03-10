/* configure access to our .env */
require("dotenv").config();

/* include express.js & socket.io */
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

/* include other packages */
const inquirer = require("inquirer");
const open = require("open");
const TextDecoder = require("text-encoding").TextDecoder;

/* hedera.js */
const {
  Client,
  ConsensusSubmitMessageTransaction,
  ConsensusTopicId,
  ConsensusTopicCreateTransaction,
  MirrorClient,
  MirrorConsensusTopicQuery
} = require("@hashgraph/sdk");

/* utilities */
const questions = require("./utils.js").initQuestions;
const UInt8ToString = require("./utils.js").UInt8ToString;
const secondsToDate = require("./utils.js").secondsToDate;
const log = require("./utils.js").handleLog;
const sleep = require("./utils.js").sleep;

/* init variables */
const mirrorNodeAddress = new MirrorClient(
  "hcs.testnet.mirrornode.hedera.com:5600"
);
const defaultTopicId = ConsensusTopicId.fromString("0.0.156824");
const specialChar = "ℏ";
var operatorAccount = "";
var HederaClient = Client.forTestnet();
var topicId = "";
var logStatus = "Default";

/* configure our env based on prompted input */
async function init() {
  inquirer.prompt(questions).then(async function(answers) {
    try {
      logStatus = answers.status;
      configureAccount(answers.account, answers.key);
      await configureTopic(answers.topic);
      /* run & serve the express app */
      runChat();
    } catch (error) {
      log("ERROR: init() failed", error, logStatus);
      process.exit(1);
    }
  });
}

function runChat() {
  app.use(express.static("public"));
  http.listen(0, function() {
    const randomInstancePort = http.address().port;
    open("http://localhost:" + randomInstancePort);
  });
  subscribeToMirror();
  io.on("connection", function(client) {
    io.emit(
      "connect message",
      operatorAccount + specialChar + client.id + specialChar + topicId
    );
    client.on("chat message", function(msg) {
      const formattedMessage =
        operatorAccount + specialChar + client.id + specialChar + msg;
      sendHCSMessage(formattedMessage);
    });
    client.on("disconnect", function() {
      io.emit("disconnect message", operatorAccount + specialChar + client.id);
    });
  });
}

init(); // process arguments & handoff to runChat()

/* helper hedera functions */
/* have feedback, questions, etc.? please feel free to file an issue! */
function sendHCSMessage(msg) {
  try {
    new ConsensusSubmitMessageTransaction()
      .setTopicId(topicId)
      .setMessage(msg)
      .execute(HederaClient);
    log("ConsensusSubmitMessageTransaction()", msg, logStatus);
  } catch (error) {
    log("ERROR: ConsensusSubmitMessageTransaction()", error, logStatus);
    process.exit(1);
  }
}

function subscribeToMirror() {
  try {
    new MirrorConsensusTopicQuery()
      .setTopicId(topicId)
      .subscribe(mirrorNodeAddress, res => {
        log("Response from MirrorConsensusTopicQuery()", res, logStatus);
        const message = new TextDecoder("utf-8").decode(res["message"]);
        var runningHash = UInt8ToString(res["runningHash"]);
        var timestamp = secondsToDate(res["consensusTimestamp"]);
        io.emit(
          "chat message",
          message +
            specialChar +
            res.sequenceNumber +
            specialChar +
            runningHash +
            specialChar +
            timestamp
        );
      });
    log("MirrorConsensusTopicQuery()", topicId.toString(), logStatus);
  } catch (error) {
    log("ERROR: MirrorConsensusTopicQuery()", error, logStatus);
    process.exit(1);
  }
}

async function createNewTopic() {
  try {
    const txId = await new ConsensusTopicCreateTransaction().execute(
      HederaClient
    );
    log("ConsensusTopicCreateTransaction()", `submitted tx ${txId}`, logStatus);
    await sleep(3000); // wait until Hedera reaches consensus
    const receipt = await txId.getReceipt(HederaClient);
    const newTopicId = receipt.getTopicId();
    log(
      "ConsensusTopicCreateTransaction()",
      `success! new topic ${newTopicId}`,
      logStatus
    );
    return newTopicId;
  } catch (error) {
    log("ERROR: ConsensusTopicCreateTransaction()", error, logStatus);
    process.exit(1);
  }
}

/* helper init functions */
function configureAccount(account, key) {
  try {
    // If either values in our init() process were empty
    // we should try and fallback to the .env configuration
    if (account === "" || key === "") {
      log("init()", "using default .env config", logStatus);
      operatorAccount = process.env.ACCOUNT_ID;
      HederaClient.setOperator(process.env.ACCOUNT_ID, process.env.PRIVATE_KEY);
    }
    // Otherwise, let's use the initalization parameters
    else {
      operatorAccount = account;
      HederaClient.setOperator(account, key);
    }
  } catch (error) {
    log("ERROR: configureAccount()", error, logStatus);
    process.exit(1);
  }
}

async function configureTopic(createArg) {
  // If the value in our init() process asked for a new topic
  // we should create one, otherwise, return the default value
  if (createArg.includes("create")) {
    log("init()", "creating new topic", logStatus);
    topicId = await createNewTopic();
    log(
      "ConsensusTopicCreateTransaction()",
      `waiting for new HCS Topic & mirror node (it may take a few seconds)`,
      logStatus
    );
    await sleep(9000);
    return;
  } else {
    log("init()", "using default topic", logStatus);
    topicId = defaultTopicId;
    return;
  }
}
