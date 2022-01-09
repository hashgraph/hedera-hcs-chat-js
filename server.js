/* configure access to our .env */
require("dotenv").config();

/* include express.js */
const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();
const app = express();
const port = 3000

// configure express to user body-parser as middleware
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

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

const client = Client.forTestnet().setOperator(operatorId, operatorKey);


router.post('/create-badge', async (req, res) => {
    // get request body fields
    const name = req.body.name;
    const symbol = req.body.symbol;
    const max = req.body.max

    const tokenId = await createBadge(name, symbol, max);

    //store token id in db

    res.status(200)
    res.send('created badge')
})

router.post('/transfer-badge', async (req, res) => {
    // get request body fields
    const CID = req.body.name;
    const tokenId = TokenId.fromString(req.body.tokenId);
    const txAccountId = TokenId.fromString(req.body.accountId);
    const txAccountKey = TokenId.fromString(req.body.accountKey);

    var accountPreBalance = getAccountBalance(txAccountId, tokenId)
    var treasuryPreBalance = getAccountBalance(treasuryId, tokenId)

    await mintBadge(CID, tokenId);
    await assignBadge(txAccountId,txAccountKey,tokenId)

    var accountPostBalance = getAccountBalance(txAccountId, tokenId)
    var treasuryPostBalance = getAccountBalance(treasuryId, tokenId)

    if (accountPostBalance == (accountPreBalance + 1) && treasuryPostBalance == (treasuryPreBalance - 1)){
        res.status(200)
        res.send('transferred badge')
    } else {
        res.status(500)
        res.send('ERR: unable to transfer badge')
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
        .freezeWith(client);

    //Sign the transaction and submit to network
    let badgeCreateTxSign = await badgeCreate.sign(treasuryKey);
    let badgeCreateSubmit = await badgeCreateTxSign.execute(client);

    //Get the transaction receipt information
    let badgeCreateRx = await badgeCreateSubmit.getReceipt(client);
    let tokenId = badgeCreateRx.tokenId;
    console.log(`- Created NFT with Token ID: ${tokenId} \n`);
    return tokenId;
}

//Minting badge
async function mintBadge(CID, tokenId) {
    let mintTx = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([Buffer.from(CID)])
        .freezeWith(client);
    
    //Sign the transaction and submit to network
    let mintTxSign = await mintTx.sign(supplyKey);
    let mintTxSubmit = await mintTxSign.execute(client);

    //Get the transaction receipt information (serial number)
    let mintRx = await mintTxSubmit.getReceipt(client);
    console.log(`- Created NFT ${tokenId} with serial: ${mintRx.serials[0].low} \n`);
}

//Assigning badge
async function assignBadge(txAccountId,txAccountKey,tokenId) {
    //Associate new account with badge
    let associateTx = await new TokenAssociateTransaction()
		.setAccountId(txAccountId)
		.setTokenIds([tokenId])
		.freezeWith(client)
		.sign(txAccountKey);

    let associateTxSubmit = await associateTx.execute(client);
    let associateRx = await associateTxSubmit.getReceipt(client);
    console.log(`- NFT association with txAccount: ${associateRx.status}\n`);

    //Transfer badge from treasury to txAccount
	let tokenTransferTx = await new TransferTransaction()
		.addNftTransfer(tokenId, 1, treasuryId, txAccountId)
		.freezeWith(client)
		.sign(treasuryKey);
    let tokenTransferSubmit = await tokenTransferTx.execute(client);
    let tokenTransferRx = await tokenTransferSubmit.getReceipt(client);
    console.log(`\n- NFT transfer from Treasury to txAccount: ${tokenTransferRx.status} \n`);
}

//Get account balance
async function getAccountBalance(accountId, tokenId) {
    var balanceCheckTx = await new AccountBalanceQuery().setAccountId(accountId).execute(client);
    var balance = balanceCheckTx.tokens._map.get(tokenId.toString())
	console.log(`- Treasury balance: ${balance} NFTs of ID ${tokenId}`);
    return balance
}
