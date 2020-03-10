# Hedera Consensus Service Chat Tutorial

An example web app which demonstrates how you can use decentralized pub-sub messaging on the Hedera Consensus Service.

## Built With

- [Hedera Hashgraph](https://www.hedera.com/) - The enterprise grade public network
- [Hedera Hashgraph's JavaScript SDK](https://github.com/hashgraph/hedera-sdk-js) - The easiest way to use Hedera in JavaScript
- [Express.js](https://expressjs.com/) - A fast, unopinionated web framework for node.js
- [Socket.io](https://socket.io/) - A realtime client to server framework for node.js

### Prerequisites

This demo assumes that you have an account on the Hedera Testnet. For example:

```
ACCOUNT_ID=0.0.123456789

PUBLIC_KEY=302a300506032b657003210013d392c9ebcf942a3 ...

PRIVATE_KEY=302e020100300506032b657004220420f4361ec73dc43e568f162 ...
```

If you don't have one yet, you can signup at [portal.hedera.com](https://portal.hedera.com/).

## Getting Started

> Note: Estimated set up is ~10 minutes. If it takes you longer, or you have any issues, feel free to reach out!

You can clone this repository by running the following command:

```
git clone https://github.com/Cooper-Kunz/hello-hedera-chat-js.git
```

Create a `.env` file in the root of the project.

Then and add your Testnet account info to the .env file, like below:

```
ACCOUNT_ID=0.0.123456789

PUBLIC_KEY=302a300506032b657003210013d392c9ebcf942a3c4ca165e6ee7721df293960001dfe0c347ea8542ef6c4a4

PRIVATE_KEY=302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6
```

After downloading and setting up our environment, we'll install our packages via [npm](https://docs.npmjs.com/about-npm/).

```
npm install
```

If installing the dependencies was succesful, now try to run the server!

```
node server.js
```

After running your server, it will prompt you to configure your chat, e.g.

```
1. What mode do you want to run in?  <--- "Default", "Minimal", "Debug"
2. What's your account ID?           <---  defaults to the .env schema
3. What's your private key?          <---  defaults to the .env schema
4. Should we create a new HCS topic, or connect to an existing one?
```

If everything was configured properly, the chat should now open at a random port location.

You can additionally run another instance of the chat application by creating a new terminal, and running the application again. This will find another unused, random port location, and deploy multiple instances to your local machine. With the environment configurability, you can test out multi-client chats.

## Contributors & maintainers

I'd love your help supporting this application. Seriously!

If you have any ideas on how to update or improve this demo, or help out, please get in touch or file a [pull request](https://github.com/hashgraph/hedera-hcs-chat-js/pulls). 

## Disclaimer

This is just a simple tutorial, please use responsibly.

Contact me, or [file an issue](/issues) if you need anything or see problems.

### LICENSE

[Apache 2.0](LICENSE)