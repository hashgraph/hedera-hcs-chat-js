/* configure access to our .env */
require("dotenv").config();

/* include express.js */
const express = require("express");
const app = express();
const port = 3000

/* hedera.js */
const {
<<<<<<< HEAD
	AccountId,
	PrivateKey,
	Client,
	TokenCreateTransaction,
	TokenType,
	TokenSupplyType,
	TokenMintTransaction,
	TransferTransaction,
	AccountBalanceQuery,
	TokenAssociateTransaction,
} = require("@hashgraph/sdk");

=======
    AccountId,
    PrivateKey,
    Client,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenMintTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    TokenAssociateTransaction,
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

/* creating the NFTs */
const supplyKey = PrivateKey.generate();
const treasuryId = AccountId.fromString(process.env.TREASURY_ID); // maybe get treasury key from organizer??
const treasuryKey = PrivateKey.fromString(process.env.TREASURY_PR_KEY);

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

// Creating badge based on info supplied by the event organizer
function createBadge(name,symbol,max) {
    //Creating the NFT
    let badgeCreate = await new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setTokenType(TokenType.NonFungibleUnique)
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(treasuryId) //maybe get treasury key from organizer?
    .setMaxSupply(max)
    .setSupplyKey(supplyKey) //check what the supply key should be
    .freezeWith(hederaClient);

    //Sign the transaction with the treasury key and submit to network
    let badgeCreateTxSign = await badgeCreate.sign(treasuryKey);
    let badgeCreateSubmit = await badgeCreateTxSign.execute(hederaClient);

     //Get the transaction receipt information
    let badgeCreateRx = await badgeCreateSubmit.getReceipt(hederaClient);
    let tokenId = badgeCreateRx.tokenId;
    console.log(`- Created NFT with Token ID: ${tokenId} \n`);
}

//Minting badges

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
>>>>>>> b44a6f9808817b18993728dbd0a8aab5fd103206

// Configure accounts and client, and generate needed keys
const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PV_KEY);
const treasuryId = AccountId.fromString(process.env.TREASURY_ID);
const treasuryKey = PrivateKey.fromString(process.env.TREASURY_PV_KEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);


app.post('/create-nft', (req, res) => {
    const supplyKey = PrivateKey.generate();
    res.send('create nft')
})

app.post('/transfer-nft', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

module.exports = router;