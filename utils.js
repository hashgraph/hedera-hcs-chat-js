var initQuestions = [
  {
    type: "list",
    name: "status",
    message: "What mode do you want to run in?",
    choices: ["Default", "Minimal", "Debug"],
    filter: function(val) {
      return val.toLowerCase();
    }
  },
  {
    type: "input",
    name: "account",
    message:
      "What's your account ID? [empty will default to the value at process.env.ACCOUNT_ID]\n"
  },
  {
    type: "password",
    name: "key",
    message:
      "What's your private key? \n[empty will default to the value at process.env.PRIVATE_KEY]\n"
  },
  {
    type: "list",
    name: "topic",
    message: "Should we create a new topic, or connect to an existing one?",
    choices: ["Create a new topic", "Connect to an existing topic"],
    filter: function(val) {
      return val.toLowerCase();
    }
  },
  {
    type: "input",
    name: "existingTopicId",
    message: "What's the topic ID?\n[empty will default to the value at process.env.TOPIC_ID]\n",
    when: (answers) => !answers.topic.includes("create")
  }
];

function UInt8ToString(array) {
  var str = "";
  for (var i = 0; i < array.length; i++) {
    str += array[i];
  }
  return str;
}

function secondsToDate(time) {
  var date = new Date(1970, 0, 1);
  date.setSeconds(time.seconds);
  return date;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function handleLog(event, log, status) {
  if (status === "default") {
    console.log(event + " " + log);
  } else if (status === "minimal") {
    console.log(event);
  } else {
    // debug mode. destructure mirror receipts or print a usual log
    if (log.toString() !== log && log["runningHash"] !== undefined) {
      console.log(event);
      console.log("\t message: " + log.toString());
      console.log("\t runningHash: " + UInt8ToString(log["runningHash"]));
      console.log(
        "\t consensusTimestamp: " + secondsToDate(log["consensusTimestamp"])
      );
    } else {
      console.log(event + " " + log);
    }
  }
}

module.exports = {
  initQuestions,
  UInt8ToString,
  secondsToDate,
  sleep,
  handleLog
};
