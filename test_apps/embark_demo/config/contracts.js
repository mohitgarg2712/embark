module.exports = {
  // default applies to all environments
  default: {
    // Blockchain node to deploy the contracts
    deployment: {
      host: "mainnet.infura.io/faCFpV7HGcaf50PLqBvB", // Host of the blockchain node
      port: false, // Port of the blockchain node
      type: "rpc", // Type of connection (ws or rpc),
      protocol: "https",
      // Accounts to use instead of the default account to populate your wallet
      accounts: [
        {
          privateKey: "0x1e0adffb16dc9de3f2e78b80ca015fba2dfe983eb5cc7b0c4afdb759d3514390"
        }
      ]
    },
    // order of connections the dapp should connect to
    dappConnection: [
      "$WEB3"  // uses pre existing web3 object if available (e.g in Mist)
    ],
    contracts: {
      "SimpleStorage": {
        "deploy": false
      }
    }
  }
};
