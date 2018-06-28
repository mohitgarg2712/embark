import namehash from 'eth-ens-namehash';
const keccak256 = require('js-sha3').keccak_256;

/*global EmbarkJS*/
let __embarkENS = {};

// resolver interface
__embarkENS.resolverInterface = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      }
    ],
    "name": "addr",
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      }
    ],
    "name": "content",
    "outputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      }
    ],
    "name": "name",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "kind",
        "type": "bytes32"
      }
    ],
    "name": "has",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "addr",
        "type": "address"
      }
    ],
    "name": "setAddr",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "hash",
        "type": "bytes32"
      }
    ],
    "name": "setContent",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "name",
        "type": "string"
      }
    ],
    "name": "setName",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "contentType",
        "type": "uint256"
      }
    ],
    "name": "ABI",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      },
      {
        "name": "",
        "type": "bytes"
      }
    ],
    "payable": false,
    "type": "function"
  }
];

const NoDecodeAddrError = 'Error: Couldn\'t decode address from ABI: 0x';
const NoDecodeStringError = 'ERROR: The returned value is not a convertible string: 0x0';

__embarkENS.setProvider = function (config) {
  const self = this;
  EmbarkJS.onReady(() => {
    self.ens = new EmbarkJS.Contract({abi: config.registryAbi, address: config.registryAddress});
    self.registrar = new EmbarkJS.Contract({abi: config.registrarAbi, address: config.registrarAddress});
  });
};

__embarkENS.resolve = function (name) {
  const self = this;

  if (self.ens === undefined) return;

  let node = namehash.hash(name);
  
  return self.ens.methods.resolver(node).call().then((resolverAddress) => {
    let resolverContract = new EmbarkJS.Contract({abi: self.resolverInterface, address: resolverAddress});
    return resolverContract.methods.addr(node).call();
  }).then((addr) => {
    return addr;
  }).catch((err) => {
    //console.log(NoDecodeAddrError);
    //console.log(err);
    if (err == NoDecodeAddrError) {
      console.log(name + " is not registered");
      return "0x";
    }
    return err;
  });
};

__embarkENS.parentNamehash = function(name) {
  let dot = name.indexOf('.');
  if (dot == -1) {
    return ['0x' + keccak256(namehash.normalize(name)), namehash.hash('')];
  } else {
    return ['0x' + keccak256(namehash.normalize(name.slice(0, dot))), namehash.hash(name.slice(dot + 1))];
  }
}

/*
* Lookup returns the reverse name resolution of an address -> name.
* @param {address} address The address to reverse lookup for a name 
*/
__embarkENS.lookup = function (address) {
  const self = this;

  if (!self.ens) {
    console.log("ENS provider not set. Exiting.");
    return;
  }
  if (address.startsWith("0x")) address = address.slice(2);

  let node = namehash.hash(address.toLowerCase() + ".addr.reverse");

  return self.ens.methods.resolver(node).call().then((resolverAddress) => {
    let resolverContract = new EmbarkJS.Contract({abi: self.resolverInterface, address: resolverAddress});
    return resolverContract.methods.name(node).call();
  }).catch((err) => {
    if (err == NoDecodeStringError || err == NoDecodeAddrError) {
      console.log('Address does not resolve to name. Try syncing chain.');
      return "";
    }
    return err;
  });
};

/**
* Register sets the name desired to a new owner with the option to choose
* where the transaction that claims the name is coming from
* @param {string} name The name to register
* @param {address} owner The owner to be of the name registered
* @param {object} opts The options to 
*/
__embarkENS.register = function(name, owner, opts) {
  const self = this;

  if (!self.ens) {
    console.log("ENS provider not set. Exiting.");
    return;
  }

  let nodes = self.parentNamehash(name);
  // will change in the future but for now we're only concerned with FIFS Registrar
  self.registrar.methods.register(nodes[0], owner).estimateGas({gas: 5000000, gasPrice: 1})
  .then((gasAmount) => {
    console.log("Gas Amount: ", gasAmount);
    self.registrar.methods.register(nodes[0], owner).send(opts ? opts : {from: web3.eth.defaultAccount, gas: gasAmount + 10000})
    .on('transactionHash', function(hash) {
      console.log("TransactionHash:", hash);
    })
    .on('receipt', function(receipt) {
      console.log("Receipt:", receipt);
    })
    .on('confirmation', function(confirmationNumber, receipt) {
      console.log("Confirmed");
      console.log("Confirmation Number:", confirmationNumber);
      console.log("Receipt:", receipt);
    })
    .on('error', (err) => {
      console.error("error: ", err);
    })
  }).catch((err) => {
    console.log("HITTING THE CATCH: ", err);
  });
}
