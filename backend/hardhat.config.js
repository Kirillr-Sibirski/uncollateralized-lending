require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  defaultNetwork: "goerli",
  networks: {
    hardhat: {},
    goerli: {
      url: `https://goerli.infura.io/v3/fe7fe4396e4746f5a6dfd225373966e5`,
      // `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [
        "3ab1a945576dab9ea32377c7827bc88a252053ad64b3cbfbd18c99bae1b0551f",
      ],
      //[process.env.PRIVATE_KEY],
    },
  },
};
