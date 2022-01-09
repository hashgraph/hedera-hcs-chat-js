const parse = require("pg-connection-string").parse;
const { Pool } = require("pg");
const prompt = require("prompt");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

// Wrapper for a transaction.  This automatically re-calls the operation with
// the client as an argument as long as the database server asks for
// the transaction to be retried.
async function retryTxn(n, max, client, operation, params) {
    await client.query("BEGIN;");
    while (true) {
        n++;
        if (n === max) {
        throw new Error("Max retry count reached.");
        }
        try {
            const res = await operation(client, params, cb);
            await client.query("COMMIT;");
            if (res !== undefined)
                return res.rows;
            else
                return
        } catch (err) {
        if (err.code !== "40001") {
            return callback(err);
        } else {
            console.log("Transaction failed. Retrying transaction.");
            console.log(err.message);
            await client.query("ROLLBACK;", () => {
            console.log("Rolling back transaction.");
            });
            await new Promise((r) => setTimeout(r, 2 ** n * 1000));
        }
        }
    }
}

// Callback
function cb(err, res) {
    if (err) throw err;

    if (res.rows.length > 0) {
        console.log("New table values:");
        res.rows.forEach((row) => {
            console.log(row);
        });
    }
    return res.rows;
}

// badge functions
async function addBadge(client, params, callback) {

    const insertStatement = "INSERT INTO badges (id, account_id, account_key, username) VALUES ($1, $2, $3, $4);";
    await client.query(deleteStatement, params, callback);
  
    const selectBadgeStatement = "SELECT token_id, token_symbol FROM badges;";
    await client.query(selectBadgeStatement, callback);
}

async function deleteBadge(client, params, callback) {
  const deleteStatement = "DELETE FROM badges WHERE id = $1;";
  await client.query(deleteStatement, params, callback);

  const selectBadgeStatement = "SELECT token_id, token_symbol FROM badges;";
  await client.query(selectBadgeStatement, callback);
}

// user functions
async function addUser(client, params, callback) {

    const insertStatement = "INSERT INTO users (id, account_id, account_key, username) VALUES ($1, $2, $3, $4, []);";
    await client.query(insertStatement, params, callback);
  
    const selectUserStatement = "SELECT username, badges FROM users;";
    await client.query(selectUserStatement, callback);
}

async function deleteUser(client, params, callback) {
  const deleteStatement = "DELETE FROM users WHERE username = $1;";
  await client.query(deleteStatement, params, callback);

  const selectUserStatement = "SELECT username, badges FROM users;";
  await client.query(selectUserStatement, callback);
}

async function getUser(client, params, callback) {
  const getUserStatement = "SELECT account_id, account_key, badges FROM users WHERE username = $1;";
  return await client.query(getUserStatement, params);
}

async function updateUserBadges(client, params, callback) {
  const updateUserStatement = "UPDATE users SET badges = $1 WHERE username = $2;";
  await client.query(updateUserStatement, params, callback);

  const selectUserStatement = "SELECT username, badges FROM users;";
  await client.query(selectUserStatement, callback);
}

//create connection with db
async function createDbClient() {
    prompt.start();
    const URI = await prompt.get("connectionString");
    var connectionString;
    // Expand $env:appdata environment variable in Windows connection string
    if (URI.connectionString.includes("env:appdata")) {
        connectionString = await URI.connectionString.replace(
        "$env:appdata",
        process.env.APPDATA
        );
    }
    // Expand $HOME environment variable in UNIX connection string
    else if (URI.connectionString.includes("HOME")){
        connectionString = await URI.connectionString.replace(
        "$HOME",
        process.env.HOME
        );
    }
    var config = parse(connectionString);
    config.port = 26257;
    config.database = "defaultdb";
    const pool = new Pool(config);

    // Connect to database
    const client = await pool.connect();
    return client;
}

module.exports = {
    retryTxn,
    cb,
    createDbClient,
    addBadge,
    deleteBadge,
    addUser,
    getUser,
    deleteUser,
    updateUserBadges
};