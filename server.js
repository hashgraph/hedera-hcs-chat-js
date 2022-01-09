/* configure access to our .env */
require("dotenv").config();

/* include express.js */
const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();
const app = express();
const port = 3000
const { v4: uuidv4 } = require("uuid");

// configure express to user body-parser as middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

//db functions
const createDbClient = require("./db.js").createDbClient;
const addBadge = require("./db.js").addBadge;
const addUser = require("./db.js").addUser;
const getUser = require("./db.js").getUser;
const updateUserBadges = require("./db.js").updateUserBadges;
const retryTxn = require("./db.js").retryTxn;

/* hedera.js */
const {
    AccountId,
    PrivateKey,
    Client,
    TokenId,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenMintTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    TokenAssociateTransaction
} = require("@hashgraph/sdk");

// Configure accounts and client, and generate needed keys
const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PV_KEY);
const treasuryId = AccountId.fromString(process.env.TREASURY_ID);
const treasuryKey = PrivateKey.fromString(process.env.TREASURY_PV_KEY);
const supplyKey = PrivateKey.generate();

const hederaClient = Client.forTestnet().setOperator(operatorId, operatorKey);

var dbClient;

app.on('listening', async () => {
    dbClient = await createDbClient();
});

router.post('/create-user', async (req, res) => {
    // get request body fields
    const name = req.body.name;
    const id = req.body.id;
    const key = req.body.key;

    //add user to db
    var userVals = [uuidv4(), id, key, name];
    console.log("adding user...");
    await retryTxn(0, 15, dbClient, addUser, userVals);

    res.status(200)
    res.send('added user')
})

router.post('/create-badge', async (req, res) => {
    // get request body fields
    const name = req.body.name;
    const symbol = req.body.symbol;
    const max = req.body.max;

    const tokenId = await createBadge(name, symbol, max);

    //store badge in db
    var userVals = [uuidv4(), tokenId, symbol, name];
    console.log("add token...");
    await retryTxn(0, 15, dbClient, addBadge, userVals);

    res.status(200)
    res.send('created badge')
})

router.post('/assign-badge', async (req, res) => {
    // get request body fields
    const CID = req.body.cid;
    const tokenId = TokenId.fromtString(req.body.tokenId);
    const txAccountName = req.body.username;

    //get user details from db
    console.log("get user...");
    const rows = await retryTxn(0, 15, dbClient, getUser, [txAccountName]);
    const txAccountId = TokenId.fromtString(rows[0].account_id);
    const txAccountKey = TokenId.fromtString(rows[0].account_key);
    const accountBadges = rows[0].badges;

    //check account balances before transaction
    var accountPreBalance = getAccountBalance(txAccountId, tokenId)
    var treasuryPreBalance = getAccountBalance(treasuryId, tokenId)

    //assign badge to user
    await mintBadge(CID, tokenId);
    await assignBadge(txAccountId,txAccountKey,tokenId)

    //check account balances after transaction
    var accountPostBalance = getAccountBalance(txAccountId, tokenId)
    var treasuryPostBalance = getAccountBalance(treasuryId, tokenId)

    if (accountPostBalance == (accountPreBalance + 1) && treasuryPostBalance == (treasuryPreBalance - 1)){
        //add new badge to user
        console.log("update badges...");
        accountBadges.push(tokenId);
        await retryTxn(0, 15, dbClient, updateUserBadges, [accountBadges, txAccountName]);

        res.status(200)
        res.send('assigned badge')
    } else {
        res.status(500)
        res.send('ERR: unable to assign badge')
    }
})

app.listen(port, () => {
    console.log(`Badger listening at http://localhost:${port}`)
})

// Creating badge based on info supplied by the event organizer
async function createBadge(name,symbol,max) {
    //Creating the NFT
    let badgeCreate = await new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(treasuryId) //maybe get treasury key from organizer?
		.setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(max)
        .setSupplyKey(supplyKey) //check what the supply key should be
        .freezeWith(hederaClient);

    //Sign the transaction and submit to network
    let badgeCreateTxSign = await badgeCreate.sign(treasuryKey);
    let badgeCreateSubmit = await badgeCreateTxSign.execute(hederaClient);

    //Get the transaction receipt information
    let badgeCreateRx = await badgeCreateSubmit.getReceipt(hederaClient);
    let tokenId = badgeCreateRx.tokenId;
    console.log(`- Created NFT with Token ID: ${tokenId} \n`);
    return tokenId;
}

//Minting badge
async function mintBadge(CID, tokenId) {
    let mintTx = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([Buffer.from(CID)])
        .freezeWith(hederaClient);
    
    //Sign the transaction and submit to network
    let mintTxSign = await mintTx.sign(supplyKey);
    let mintTxSubmit = await mintTxSign.execute(hederaClient);

    //Get the transaction receipt information (serial number)
    let mintRx = await mintTxSubmit.getReceipt(hederaClient);
    console.log(`- Created NFT ${tokenId} with serial: ${mintRx.serials[0].low} \n`);
}

//Assigning badge
async function assignBadge(txAccountId,txAccountKey,tokenId) {
    //Associate new account with badge
    let associateTx = await new TokenAssociateTransaction()
		.setAccountId(txAccountId)
		.setTokenIds([tokenId])
		.freezeWith(hederaClient)
		.sign(txAccountKey);

    let associateTxSubmit = await associateTx.execute(hederaClient);
    let associateRx = await associateTxSubmit.getReceipt(hederaClient);
    console.log(`- NFT association with txAccount: ${associateRx.status}\n`);

    //Transfer badge from treasury to txAccount
	let tokenTransferTx = await new TransferTransaction()
		.addNftTransfer(tokenId, 1, treasuryId, txAccountId)
		.freezeWith(hederaClient)
		.sign(treasuryKey);
    let tokenTransferSubmit = await tokenTransferTx.execute(hederaClient);
    let tokenTransferRx = await tokenTransferSubmit.getReceipt(hederaClient);
    console.log(`\n- NFT transfer from Treasury to txAccount: ${tokenTransferRx.status} \n`);
}

//Get account balance
async function getAccountBalance(accountId, tokenId) {
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(accountId).execute(hederaClient);
    var balance = balanceCheckTx.tokens._map.get(tokenId.toString())
	console.log(`- Treasury balance: ${balance} NFTs of ID ${tokenId}`);
    return balance
}
