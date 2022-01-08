/* configure access to our .env */
require("dotenv").config();

/* include express.js */
const express = require("express");
const app = express();
const port = 3000

/* hedera.js */
const {
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