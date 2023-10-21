const { ethers } = require("ethers");
require('dotenv').config();
const fs = require("fs"); // Import the Node.js file system module

// Load the ABI from your JSON file
const contractAbi = JSON.parse(fs.readFileSync("./ABI.json", "utf8"))

// Infura API key and your private key
const infuraApiKey = process.env.INFURA_API_KEY;
const privateKey = process.env.PRIVATE_KEY;

const contractAddress = "0x0a9D3FF1C7c07637B9C59640520Dc9989aadfd46";

// Create a new wallet from the private key
const wallet = new ethers.Wallet(privateKey);

const provider = new ethers.providers.InfuraProvider('goerli', infuraApiKey);
const contract = new ethers.Contract(contractAddress, contractAbi, provider);

// Set an interval and run it every 10 sec
async function processComets() {
    try {
        const cometAddresses = [];

        // Get the total number of addresses in the array
        const totalAddresses = await contract.borrowersLength(); // You need to add this function to your smart contract

        // Loop through the array and retrieve each address
        for (let i = 0; i < totalAddresses; i++) {
            const address = await contract.borrowers(i);
            cometAddresses.push(address);
        }

        console.log(cometAddresses); // The entire array of addresses

        for(let i = 0; i <= cometAddresses.length; i++) {
            const isLiquitable = await contract.checkLiquitable(cometAddresses[i]);// Check if liquitable
            if(isLiquitable) {
                const contractFunction = contract.connect(wallet).liquidateEvent(cometAddresses[i]);
                const transactionOptions = {
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                };
                const txResponse = await contractFunction.send(transactionOptions);
                await txResponse.wait();
            }
            const health = await contract.checkRepay(cometAddresses[i])[0];
            if(health < 15) {
                // We send message to a user to repay the loan
                const contractFunction = contract.connect(wallet).repayDueDay(cometAddresses[i]);
                const transactionOptions = {
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                };
                const txResponse = await contractFunction.send(transactionOptions);
                await txResponse.wait();
            }
            const dateNow = await contract.checkPayment(cometAddresses[i])[0];
            const duePay = await contract.checkPayment(cometAddresses[i])[1];
            const daysPassed = (dateNow-duePay)/86400; 
            // If loan was repaid this won't execute but the only problem rn is that it will constantly call overdue payment function on the smart contract we need some kind of a counter.
            if(daysPassed >= 3) {
                const contractFunction = contract.connect(wallet).overduePaymentEvent(cometAddresses[i], 3);
                const transactionOptions = {
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                };
                const txResponse = await contractFunction.send(transactionOptions);
                await txResponse.wait();
            } else if(daysPassed >= 2) {
                const contractFunction = contract.connect(wallet).overduePaymentEvent(cometAddresses[i], 2);
                const transactionOptions = {
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                };
                const txResponse = await contractFunction.send(transactionOptions);
                await txResponse.wait();
            } else if(daysPassed >= 1){
                const contractFunction = contract.connect(wallet).overduePaymentEvent(cometAddresses[i], 1);
                const transactionOptions = {
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                };
                const txResponse = await contractFunction.send(transactionOptions);
                await txResponse.wait();
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
    setTimeout(processComets, 600000); // Set it to run every 10 minutes
}

processComets();