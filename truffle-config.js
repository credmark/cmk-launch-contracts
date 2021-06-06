require('dotenv').config({path: process.env.CONFIG});
const HDWalletProvider = require("truffle-hdwallet-provider");
const mnemonic = process.env.MNEMONIC;

module.exports = {
  networks: {
    development: {
     host: "127.0.0.1",
     port: 7545,
     network_id: "*",
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(mnemonic, `https://ropsten.infura.io/${process.env.INFURA_PROJECT}`, 0, 9);
      },
      network_id: 3
    },
    rinkeby: {
      provider: function() {
        return new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/${process.env.INFURA_PROJECT}`, 0, 9);
      },
      network_id: 4
    },
    kovan: {
      provider: function() {
        return new HDWalletProvider(mnemonic, `https://kovan.infura.io/v3/${process.env.INFURA_PROJECT}`, 0, 9);
      },
      network_id: 42
    },
    // main: {
    //   provider: function() {
    //     return new HDWalletProvider(mnemonic, `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT}`, 0, 9);
    //   },
    //   gasPrice: 38000000000, 
    //   network_id: 1
    // }
  },
  plugins: ["solidity-coverage"],
  compilers: {
    solc: {
      version: "0.8.4",
    }
  }
};