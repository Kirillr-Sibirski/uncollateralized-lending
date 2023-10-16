// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@sismo-core/sismo-connect-solidity/contracts/SismoConnectLib.sol";
import "./CometHelper.sol";
// Import Comet smart contract here

contract ManagerContract is SismoConnect { // inherits from Sismo Connect library
    event vaultIdReceived(uint256 value1);

    bytes16 private _appId = 0xf4977993e52606cfd67b7a1cde717069;
    address public _collateralAsset = 0x3EE77595A8459e93C2888b13aDB354017B198188; // Need proper address; This is just DUMMY data
    address public _borrowAsset = 0x3EE77595A8459e93C2888b13aDB354017B198188; // Need proper address; This is just DUMMY data
    mapping(address => CometHelper) public specificComets;


    constructor()
        SismoConnect(buildConfig({appId: _appId})) // <--- Sismo Connect constructor
    {}

    function estimateLoan(bytes memory sismoConnectResponse) public returns(uint16, uint256, uint16){    
        SismoConnectVerifiedResult memory result = verify({
            responseBytes: sismoConnectResponse,
            auth: buildAuth({authType: AuthType.EVM_ACCOUNT}),
            claim: buildClaim({groupId: 0x42c768bb8ae79e4c5c05d3b51a4ec74a}),
            // we also want to check if the signed message provided in the response is the signature of the user's address
            signature:  buildSignature({message: abi.encode(msg.sender)})
        });

        uint256 vaultId = SismoConnectHelper.getUserId(result, AuthType.EVM_ACCOUNT);
        emit vaultIdReceived(vaultId);
        // Sismo has been connected successfully
        // Look up user's credit score in the Sismo data group or add user to the data group and give a default loan rate
        uint16 creditScore = 10; // For example, we can set 10 to be the default value
        // Based on the credit score, we calculate interest rate and borrowable amount.
        uint256 borrowable;
        uint16 interestRate;
        if(creditScore <= 3) {
            // The worst credit score
            borrowable = 5; // USDC
            interestRate = 200; // % per year
        } else if (creditScore <= 10) {
            // That's where beginners land
            borrowable = 10; // USDC
            interestRate = 150; // % per year
        } else if (creditScore <= 30) {
            borrowable = 30; // USDC
            interestRate = 50; // % per year
        } else if (creditScore <= 50) {
            borrowable = 100; // USDC
            interestRate = 30; // % per year
        } else if (creditScore <= 70) {
            borrowable = 200; // USDC
            interestRate = 25; // % per year
        } else if (creditScore <= 90) {
            borrowable = 400; // USDC
            interestRate = 20; // % per year
        } else {
            // The best credit score
            borrowable = 1000; // USDC
            interestRate = 15; // % per year
        }
        // It's also would be a good practice if we could check that interest rate on the Compound protocol is lower than our's so we can actually generate some money
        return(creditScore, borrowable, interestRate);
    }
}

contract LoanFactory is ManagerContract, CometHelper(address(this)) { // This contract must be funded aka it is used as treasury
    ERC20 public token;

    constructor() {
        token = ERC20(_collateralAsset);
    }


    modifier onlyBorrower {
        require(address(specificComets[msg.sender]) != address(0), "User does not have an active loan.");
        _;
    }

    function getLoan(bytes memory sismoConnectResponse) public {
        require(address(specificComets[msg.sender]) == address(0), "User already has an active loan.");
        (uint16 creditScore, uint256 borrowable, uint16 interestRate) = estimateLoan(sismoConnectResponse); // We estimate loan and also check that user has digital identity and meets the requirements
        uint collateralAmount = borrowable*2; // For now, we just supply twice as much collateral to make everything easier but ideally we need a proper way which calls Compound for minimal borrowable amount etc.
        require (address(this).balance >= collateralAmount, "Not enough funds in the factory contract.");
        CometHelper cometUser = new CometHelper(address(this));
        specificComets[msg.sender] = cometUser;
        require(token.transfer(address(cometUser), collateralAmount), "Token transfer to user's treasury failed.");
        cometUser.supply(_collateralAsset, collateralAmount); // We supply collateral
        cometUser.withdrawToUser(_borrowAsset, borrowable, msg.sender); // We get the borrowed amount to user's treasury
    }

    /*
        Determines how much the user must repay in order to get back on a healthy score;
    */
    function needToRepay() onlyBorrower public view returns(int, int) { // We can do a loop on frontend side.
        CometHelper cometUser = specificComets[msg.sender];
        (int health, int repay) = cometUser.needToRepay(_collateralAsset);
        if(liquitable()) { // that means that the collateral is most likely to be liquidated -> defaulted
           // Send the message to user to liquidate
           // Downgrade credit score 
           // We also withdraw all the remaining collateral here
        }
        if(block.timestamp > cometUser.paymentDue()) { // If payment was overdue by 1 day
            // In frontend, when the event was emitted, we just check that we received the event one time (because in this implentation it will ciosntantly be emitted until user repays it)
            // Send the message to user to liquidate
            // Downgrade credit score
        }
        // If health < 1.5*10, we send a message to user to repay the needed amount
        // Also check if user hasn't repaid the amount for more than a day, we downgrade the credit score
        return (health, repay); // Ok, we can use XMTP SDK to message the user to repay the loan but how do we downgrade credit score without changing the state?
    }

    /*
        Repay back the borrowed amount
    */
    function repayInterestRate(uint amount) onlyBorrower public payable {
        require(
            token.transferFrom(msg.sender, address(specificComets[msg.sender]), amount),
            "Transfer failed. Ensure you've approved this contract."
        );
        specificComets[msg.sender].supply(_borrowAsset, amount);
        CometHelper cometUser = specificComets[msg.sender];
        cometUser.setRepayDue(block.timestamp+86400); // Reset the repay date
    }

    function repayFull() onlyBorrower public payable { 
        int owedAmount = owed();

        require(
            token.transferFrom(msg.sender, address(specificComets[msg.sender]), uint(owedAmount)),
            "Transfer failed. Ensure you've approved this contract."
        );
        specificComets[msg.sender].repayFullBorrow(_borrowAsset, _collateralAsset);
        delete specificComets[msg.sender]; 
    }

    function totalOwed() onlyBorrower public view returns(int){
        return specificComets[msg.sender].owed(); 
    }

}