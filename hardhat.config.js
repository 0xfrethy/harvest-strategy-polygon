require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-truffle5");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 137,
      forking: {
        url: "https://rpc-mainnet.maticvigil.com",
      },
    },
    matic: {
      url: "https://rpc-mainnet.maticvigil.com",
      chainId: 137,
    },
  },
  solidity: {
    compilers: [
      {version: "0.6.12",
       settings: {
         optimizer: {
           enabled: true,
           runs: 150
         }
       }},
    ]
  },
  mocha: {
    timeout: 2000000
  },
};
