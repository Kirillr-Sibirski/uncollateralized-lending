const { ethers } = require("ethers");

// Infura API key and your private key
const infuraApiKey = 'YOUR_INFURA_API_KEY';
const privateKey = 'YOUR_PRIVATE_KEY';

// Create a new wallet from the private key
const wallet = new ethers.Wallet(privateKey);

// Connect to the Ethereum network using Infura
const infuraProvider = new ethers.providers.InfuraProvider('goerli', infuraApiKey);

const provider = new ethers.providers.InfuraProvider(network, infuraApiKey);
const contract = new ethers.Contract(contractAddress, contractAbi, provider);

// Set an interval and run it every 10 sec
while (true) {
    try {
        const cometAddresses = await contract.specificComets.keys();

        console.log('Result:', result);
        for(let i = 0; i < cometAddresses.length; i++) {
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
                // Set isOverdue variable in Comet as true
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
            if(daysPassed > 3) {
                const contractFunction = contract.connect(wallet).overduePaymentEvent(cometAddresses[i], 3);
                const transactionOptions = {
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                };
                const txResponse = await contractFunction.send(transactionOptions);
                await txResponse.wait();
            } else if(daysPassed > 2) {
                const contractFunction = contract.connect(wallet).overduePaymentEvent(cometAddresses[i], 2);
                const transactionOptions = {
                    gasLimit: 2000000, // Adjust the gas limit as needed
                    gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price as needed
                };
                const txResponse = await contractFunction.send(transactionOptions);
                await txResponse.wait();
            } else {
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
}