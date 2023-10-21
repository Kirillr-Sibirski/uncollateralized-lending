const { ethers } = require("ethers");
require('dotenv').config();
const fs = require("fs"); // Import the Node.js file system module

// Load the ABI from your JSON file
const contractAbi = JSON.parse(fs.readFileSync("./ABI.json", "utf8"))

// Infura API key and your private key
const infuraApiKey = process.env.INFURA_API_KEY;
const privateKey = process.env.PRIVATE_KEY;

const contractAddress = "0xb868477D12FeDCF861f85a612e740d1F5f430ef0";

const provider = new ethers.providers.InfuraProvider('goerli', infuraApiKey);
// Create a new wallet from the private key
const wallet = new ethers.Wallet(privateKey, provider);

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

        for(let i = 0; i <= cometAddresses.length-1; i++) {
            console.log(cometAddresses[i]);
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
            const hexValue = await contract.checkRepay(cometAddresses[i]);
            const health = ethers.utils.formatUnits(hexValue[0], 0); // 0 is the number of decimal places

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
            const checkPaymentResult = await contract.checkPayment(cometAddresses[i]);
            const dateNow = ethers.utils.formatUnits(checkPaymentResult[0], 0); // 0 is the number of decimal places
            const duePay = ethers.utils.formatUnits(checkPaymentResult[1], 0); // 0 is the number of decimal places

            const checkIsOverdue = await contract.checkIsOverdue(cometAddresses[i]);

            var daysPassed;
            if(checkIsOverdue)
                daysPassed = (dateNow-duePay)/86400; // Problem with this one. dateNow - 0 / day is not gonna equal to what we want
            else
                daysPassed = 0;

            // If loan was repaid this won't execute but the only problem rn is that it will constantly call overdue payment function on the smart contract we need some kind of a counter.
            if(daysPassed >= 3) {
                console.log("More than 3 days passed.");
                const contractFunction = contract.connect(wallet).overduePaymentEvent(cometAddresses[i], 3);
                const transactionOptions = {
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                };
                const txResponse = await contractFunction.send(transactionOptions);
                await txResponse.wait();
            } else if(daysPassed >= 2) {
                console.log("More than 2 days passed.");
                const contractFunction = contract.connect(wallet).overduePaymentEvent(cometAddresses[i], 2);
                const transactionOptions = {
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                };
                const txResponse = await contractFunction.send(transactionOptions);
                await txResponse.wait();
            } else if(daysPassed >= 1){
                console.log("More than 1 day passed.");
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
        console.error(error);
    }
    setTimeout(processComets, 6000); // Set it to run every 10 minutes //600000
}

processComets();