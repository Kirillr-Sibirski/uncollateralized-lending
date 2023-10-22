const { ethers } = require("ethers");
require('dotenv').config();
const fs = require("fs"); // Import the Node.js file system module
const PushAPI = require("@pushprotocol/restapi");

// Load the ABI from your JSON file
const contractAbi = JSON.parse(fs.readFileSync("./ABI.json", "utf8"))

// Infura API key and your private key
const infuraApiKey = process.env.INFURA_API_KEY;
const privateKey = process.env.PRIVATE_KEY;

const contractAddress = "0xeBCFaD55a5917fD2014E5E015E0c66E4c304a402";

const provider = new ethers.providers.InfuraProvider('goerli', infuraApiKey);
// Create a new wallet from the private key
const wallet = new ethers.Wallet(privateKey, provider);
const userAlice = await PushAPI.initialize(wallet, { env: 'staging' });

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
                // We send notification
                await userAlice.channel.send([cometAddresses[i]], { 
                notification: {
                    title: 'Your loan has been defaulted.',
                    body: 'Your credit score has been damaged.',
                }
                });

                // Define the transaction details
                const encodedData = contract.interface.encodeFunctionData('liquidateEvent(address)', [cometAddresses[i]]);
                const transaction = {
                    to: contract.address, // The address of the smart contract
                    data: encodedData, // Populate transaction data
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                    value: 0, // If you're not sending ETH along with the transaction
                };

                // Send the transaction
                const txResponse = await wallet.sendTransaction(transaction);
                // Wait for the transaction to be mined
                await txResponse.wait();
            }
            const hexValue = await contract.checkRepay(cometAddresses[i]);
            const health = ethers.utils.formatUnits(hexValue[0], 0); // 0 is the number of decimal places

            if(health < 15) {
                // We send notification to user notifying them that collateral to loan ratio is unhealthy.
                await userAlice.channel.send([cometAddresses[i]], { 
                    notification: {
                      title: 'Collateral to loan ratio has gone down',
                      body: 'You have one day to repay interest rate on your loan before your credit score will be decreased.',
                    }
                  });

                // Define the transaction details
                const encodedData = contract.interface.encodeFunctionData('repayDueDay(address)', [cometAddresses[i]]);
                const transaction = {
                    to: contract.address, // The address of the smart contract
                    data: encodedData, // Populate transaction data
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                    value: 0, // If you're not sending ETH along with the transaction
                };

                // Send the transaction
                const txResponse = await wallet.sendTransaction(transaction);

                // Wait for the transaction to be mined
                await txResponse.wait();
            }
            const checkPaymentResult = await contract.checkPayment(cometAddresses[i]);
            const dateNow = ethers.utils.formatUnits(checkPaymentResult[0], 0); // 0 is the number of decimal places
            const duePay = ethers.utils.formatUnits(checkPaymentResult[1], 0); // 0 is the number of decimal places
            console.log("Due pay: ",duePay);

            var daysPassed;
            if(duePay != 0)
                daysPassed = (dateNow-duePay)/86400; // Problem with this one. dateNow - 0 / day is not gonna equal to what we want
            else
                daysPassed = 0;
            console.log("Days passed: ",daysPassed);

            // If loan was repaid this won't execute but the only problem rn is that it will constantly call overdue payment function on the smart contract we need some kind of a counter.
            if(daysPassed >= 3) {
                console.log("More than 3 days passed.")
                // We send notification
                await userAlice.channel.send([cometAddresses[i]], { 
                    notification: {
                        title: 'Your loan payment is overdue by 3 days!',
                        body: 'Your credit score has been damaged.',
                    }
                });

                // Define the transaction details
                const encodedData = contract.interface.encodeFunctionData('overduePaymentEvent(address, uint)', [cometAddresses[i]], 3);
                const transaction = {
                    to: contract.address, // The address of the smart contract
                    data: encodedData, // Populate transaction data
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                    value: 0, // If you're not sending ETH along with the transaction
                };

                // Send the transaction
                const txResponse = await wallet.sendTransaction(transaction);
                // Wait for the transaction to be mined
                await txResponse.wait();
            } else if(daysPassed >= 2) {
                await userAlice.channel.send([cometAddresses[i]], { 
                    notification: {
                        title: 'Your loan payment is overdue by 2 days!',
                        body: 'Your credit score has been damaged.',
                    }
                });
                console.log("More than 2 days passed.");
                // Define the transaction details
                const encodedData = contract.interface.encodeFunctionData('overduePaymentEvent(address, uint)', [cometAddresses[i]], 2);
                const transaction = {
                    to: contract.address, // The address of the smart contract
                    data: encodedData, // Populate transaction data
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                    value: 0, // If you're not sending ETH along with the transaction
                };

                // Send the transaction
                const txResponse = await wallet.sendTransaction(transaction);
                // Wait for the transaction to be mined
                await txResponse.wait();
            } else if(daysPassed >= 1){
                await userAlice.channel.send([cometAddresses[i]], { 
                    notification: {
                        title: 'Your loan payment is overdue by 1 days!',
                        body: 'Your credit score has been damaged.',
                    }
                });
                console.log("More than 1 day passed.");
                // Define the transaction details
                const encodedData = contract.interface.encodeFunctionData('overduePaymentEvent(address, uint)', [cometAddresses[i]], 1);
                const transaction = {
                    to: contract.address, // The address of the smart contract
                    data: encodedData, // Populate transaction data
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                    value: 0, // If you're not sending ETH along with the transaction
                };

                // Send the transaction
                const txResponse = await wallet.sendTransaction(transaction);
                // Wait for the transaction to be mined
                await txResponse.wait();
            }
        }
    } catch (error) {
        console.error(error);
    }
    setTimeout(processComets, 6000); // Set it to run every 10 minutes //600000
}

processComets();