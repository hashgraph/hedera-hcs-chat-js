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
    TopicId,
    TopicMessageSubmitTransaction,
    TopicCreateTransaction,
    TopicMessageQuery
} = require("@hashgraph/sdk");

/* utilities */
const questions = require("./utils.js").initQuestions;
const UInt8ToString = require("./utils.js").UInt8ToString;
const secondsToDate = require("./utils.js").secondsToDate;
const log = require("./utils.js").handleLog;
const sleep = require("./utils.js").sleep;

let operatorAccount = "";
const hederaClient = Client.forTestnet();
let topicId = "";
let logStatus = "Default";

/* configure our env based on prompted input */
async function init() {
    inquirer.prompt(questions).then(async function (answers) {
        try {
            logStatus = answers.status;
            configureAccount(answers.account, answers.key);
            if (answers.existingTopicId != undefined) {
                configureExistingTopic(answers.existingTopicId);
            } else {
                await configureNewTopic();
            }
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
    http.listen(0, function () {
        const randomInstancePort = http.address().port;
        open("http://localhost:" + randomInstancePort);
    });
    subscribeToMirror();
    io.on("connection", function (client) {
        const connectMessage = {
            operatorAccount: operatorAccount,
            client: client.id,
            topicId: topicId.toString()
        }
        io.emit(
            "connect message",
            JSON.stringify(connectMessage)
        );
        client.on("chat message", function (msg) {
            const message = {
                operatorAccount: operatorAccount,
                client: client.id,
                message: msg
            }
            sendHCSMessage(JSON.stringify(message));
        });
        client.on("disconnect", function () {
            const disconnect = {
                operatorAccount: operatorAccount,
                client: client.id
            }
            io.emit("disconnect message", JSON.stringify(disconnect));
        });
    });
}

init(); // process arguments & handoff to runChat()

/* helper hedera functions */

/* have feedback, questions, etc.? please feel free to file an issue! */
function sendHCSMessage(msg) {
    try {
        // let's fire and forget here, we're not waiting for a receipt, just sending
        new TopicMessageSubmitTransaction()
            .setTopicId(topicId)
            .setMessage(msg)
            .execute(hederaClient);

        log("TopicMessageSubmitTransaction()", msg, logStatus);
    } catch (error) {
        log("ERROR: TopicMessageSubmitTransaction()", error, logStatus);
        process.exit(1);
    }
}

function subscribeToMirror() {
    try {
        new TopicMessageQuery()
            .setTopicId(topicId)
            .subscribe(hederaClient,
                (error) => {
                    log("Message subscriber raised an error", error, logStatus);
                },
                (message) => {
                    log("Response from TopicMessageQuery()", message, logStatus);
                    const mirrorMessage = new TextDecoder("utf-8").decode(message.contents);
                    const messageJson = JSON.parse(mirrorMessage);
                    log("Parsed mirror message", logStatus);
                    const runningHash = UInt8ToString(message["runningHash"]);
                    const timestamp = secondsToDate(message["consensusTimestamp"]);

                    const messageToUI = {
                        operatorAccount: messageJson.operatorAccount,
                        client: messageJson.client,
                        message: messageJson.message,
                        sequence: message.sequenceNumber.toString(10), // sequence number is a big integer
                        runningHash: runningHash,
                        timestamp: timestamp
                    }
                    io.emit(
                        "chat message",
                        JSON.stringify(messageToUI)
                    );
                }
            );
        log("MirrorConsensusTopicQuery()", topicId.toString(), logStatus);
    } catch (error) {
        log("ERROR: MirrorConsensusTopicQuery()", error, logStatus);
        process.exit(1);
    }
}

async function createNewTopic() {
    try {
        const response = await new TopicCreateTransaction().execute(hederaClient);
        log("TopicCreateTransaction()", `submitted tx`, logStatus);
        const receipt = await response.getReceipt(hederaClient);
        const newTopicId = receipt.topicId;
        log(
            "TopicCreateTransaction()",
            `success! new topic ${newTopicId}`,
            logStatus
        );
        return newTopicId;
    } catch (error) {
        log("ERROR: TopicCreateTransaction()", error, logStatus);
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
            hederaClient.setOperator(process.env.ACCOUNT_ID, process.env.PRIVATE_KEY);
        }
        // Otherwise, let's use the initalization parameters
        else {
            operatorAccount = account;
            hederaClient.setOperator(account, key);
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
        "ConsensusTopicCreateTransaction()",
        `waiting for new HCS Topic & mirror node (it may take a few seconds)`,
        logStatus
    );
    await sleep(9000);

}

async function configureExistingTopic(existingTopicId) {
    log("init()", "connecting to existing topic", logStatus);
    if (existingTopicId === "") {
        topicId = TopicId.fromString(process.env.TOPIC_ID);
    } else {
        topicId = TopicId.fromString(existingTopicId);
    }
}
