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
  AccountId,
  PrivateKey,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  TopicId,
  TopicCreateTransaction,
} = require("@hashgraph/sdk");

/* utilities */
const questions = require("./utils.js").initQuestions;
const UInt8ToString = require("./utils.js").UInt8ToString;
const secondsToDate = require("./utils.js").secondsToDate;
const log = require("./utils.js").handleLog;
const sleep = require("./utils.js").sleep;

/* init variables */
const specialChar = "ℏ";
var operatorAccount = "";
var operatorKey = "";
var HederaClient = Client.forTestnet();
var topicId = "";
var logStatus = "Default";

/* configure env based on prompts */
async function init() {
    inquirer.prompt(questions).then(async function(answers) {
      try {
	logStatus = answers.status;
	configureAccount(answers.account, answers.key);
	if (answers.existingTopicId != undefined) {
          configureExistingTopic(answers.existingTopicId);
	} else {
          await configureNewTopic();
	}
	runChat();		
      } catch (error) {
	log("ERROR: init() failed", error, logstatus);
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

init();
/* helper init functinos */
function configureAccount(account, key) {
    try {
	// If either values in our init() process were empty
	// we should try and fallback to the .env configuration
	if (account === "" || key === "") {
	    log("init()", "using default .env config", logStatus);
	    operatorAccount = AccountId.fromString(process.env.ACCOUNT_ID);
	    operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);
	    HederaClient.setOperator(operatorAccount, operatorKey);
	}
	// Otherwise, let's use the initalization parameters
	else {
	    operatorAccount = AccountId.fromString(account);
	    operatorKey = PrivateKey.fromString(key);
	    HederaClient.setOperator(operatorAccount, operatorKey);
	}
    } catch (error) {
	log("ERROR: configureAccount()", error, logStatus);
	process.exit(1);
    }    
}

async function configureNewTopic() {
    log("init()", "creating new topic", logStatus);
    topicId = await createNewTopic();
    log(
	"TopicCreateTransaction()",
	`waiting for new HCS Topic & mirror node (it may take a few seconds)`,
	logStatus
    );
    await sleep(9000);
    return;
}

async function configureExistingTopic(existingTopicId) {
    log("init()", "connecting to existing topic", logStatus);
  if (existingTopicId === "") {
	topicId = TopicId.fromString(process.env.TOPIC_ID);
    } else {
	topicId = TopicId.fromString(existingTopicId);
    }
}

/* helper hedera functions */
/* have feedback, questions, etc.? please feel free to file an issue! */
function sendHCSMessage(msg) {
    try {
	new TopicMessageSubmitTransaction()
	    .setTopicId(topicId)
	    .setMessage(msg)
	    .execute(HederaClient);
	log("TopicSubmitMessageTransaction()", msg, logStatus);
    } catch (error) {
	log("ERROR: TopicSubmitMessageTransaction()", error, logStatus);
	process.exit(1);
    }
}

function subscribeToMirror() {
    try {
	new TopicMessageQuery()      
	    .setTopicId(topicId)
	    .subscribe(HederaClient, res => {
		log("Response from TopicMessageQuery()", res.contents, logStatus);
		const message = new TextDecoder("utf-8").decode(res.contents);
		var runningHash = UInt8ToString(res.runningHash);
		var timestamp = secondsToDate(res.consensusTimestamp);
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
	log("TopicMessageQuery()", topicId.toString(), logStatus);
    } catch (error) {
	log("ERROR: TopicMessageQuery()", error, logStatus);
	process.exit(1);
    }
}

async function createNewTopic() {
    try {
	const txId = await new TopicCreateTransaction().execute(HederaClient);
	log("TopicCreateTransaction()", `submitted tx ${txId.transactionId}`, logStatus);
	await sleep(3000); // wait until Hedera reaches consensus
	const receipt = await txId.getReceipt(HederaClient);
	const newTopicId = receipt.topicId;
	log(
	    "ConsensusTopicCreateTransaction()",
	    `success! new topic ${newTopicId}`,
	    logStatus
	);
	return newTopicId;
    } catch (error) {
	log("ERROR: TopicCreateTransaction()", error, logStatus);
	process.exit(1);
    }
}
