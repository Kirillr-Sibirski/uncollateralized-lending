const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  
  // Deploy ManagerContract
  const ManagerContract = await hre.ethers.deployContract("ManagerContract");
  // Deploy LoanFactory and pass the address of ManagerContract to its constructor
  const LoanFactory = await hre.ethers.deployContract("LoanFactory");

  console.log("ManagerContract deployed to:", await ManagerContract.getAddress());
  console.log("LoanFactory deployed to:", await LoanFactory.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
