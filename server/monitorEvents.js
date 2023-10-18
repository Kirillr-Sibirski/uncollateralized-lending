const { ethers } = require("ethers");

// Infura API key and your private key
const infuraApiKey = 'YOUR_INFURA_API_KEY';
const privateKey = 'YOUR_PRIVATE_KEY';

// Create a new wallet from the private key
const wallet = new ethers.Wallet(privateKey);

// Connect to the Ethereum network using Infura
const infuraProvider = new ethers.providers.InfuraProvider('sepolia', infuraApiKey);

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
            // Somehow need to also check that if the loan was indeed repaid, we don't charge the user or something
            if(0 > daysPassed) {
                // overduePaymentEvent call
                continue
            } else if(daysPassed <= 1) { // Loan has been overdue by one day
                // overduePaymentEvent call
            } else if(daysPassed <= 3) { // Loan has been overdue by 3 days
                // overduePaymentEvent call
            } else { // Loan has been overdue by > 3 days
                // overduePaymentEvent call
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}