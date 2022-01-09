const parse = require("pg-connection-string").parse;
const { Pool } = require("pg");
const prompt = require("prompt");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

// Wrapper for a transaction.  This automatically re-calls the operation with
// the client as an argument as long as the database server asks for
// the transaction to be retried.
async function retryTxn(n, max, client, operation, params, callback) {
  await client.query("BEGIN;");
  while (true) {
    n++;
    if (n === max) {
      throw new Error("Max retry count reached.");
    }
    try {
      await operation(client, params, callback);
      await client.query("COMMIT;");
      return;
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

// This function is called within the first transaction. It inserts some initial values into the "users" table.
async function initTable(client, params, callback) {
  const insertStatement =
    "INSERT INTO users (id, account_id, account_key, username) VALUES ($1, $2, $3, $4);";
  await client.query(insertStatement, params, callback);
  
  const selectBadgeStatement = "SELECT token_id, token_symbol FROM badges;";
  await client.query(selectBadgeStatement, callback);
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

async function getBadge(client, params, callback) {
  const selectBadgeStatement = "SELECT token_id FROM badges WHERE token_symbol = $1;";
  await client.query(selectBadgeStatement, params, callback);
}

// user functions
async function addUser(client, params, callback) {

    const insertStatement = "INSERT INTO users (id, account_id, account_key, username) VALUES ($1, $2, $3, $4);";
    await client.query(deleteStatement, params, callback);
  
    const selectBadgeStatement = "SELECT token_id, token_symbol FROM users;";
    await client.query(selectBadgeStatement, callback);
}

async function deleteUser(client, params, callback) {
  const deleteStatement = "DELETE FROM users WHERE username = $1;";
  await client.query(deleteStatement, params, callback);

  const selectBadgeStatement = "SELECT token_id, token_symbol FROM users;";
  await client.query(selectBadgeStatement, callback);
}

async function getUser(client, params, callback) {
  const selectBadgeStatement = "SELECT account_id, account_key FROM users WHERE username = $1;";
  await client.query(selectBadgeStatement, params, callback);
}

// Run the transactions in the connection pool
(async () => {
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

    // Callback
    function cb(err, res) {
        if (err) throw err;

        if (res.rows.length > 0) {
        console.log("New table values:");
        res.rows.forEach((row) => {
            console.log(row);
        });
        }
    }
  
    var userVals = [uuidv4(), process.env.TEST_ID, process.env.TEST_KEY, "jane doe"];

    // Initialize table in transaction retry wrapper
    console.log("Initializing tables...");
    await retryTxn(0, 15, client, initTable, userVals, cb);

    // Exit program
    process.exit();
})().catch((err) => console.log(err.stack));