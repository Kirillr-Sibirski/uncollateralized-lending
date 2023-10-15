// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@sismo-core/sismo-connect-solidity/contracts/SismoConnectLib.sol";
import "./CometHelper.sol";
// Import Comet smart contract here

contract ManagerContract is SismoConnect { // inherits from Sismo Connect library
    event vaultIdReceived(uint256 value1);

    bytes16 private _appId = 0xf4977993e52606cfd67b7a1cde717069;
    address public _cometAddess = 0x3EE77595A8459e93C2888b13aDB354017B198188; // USDC-Goerli // Mainnet: 0xc3d688B66703497DAA19211EEdff47f25384cdc3
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

contract LoanFactory is ManagerContract { // This contract must be funded aka it is used as treasury

    modifier onlyBorrower {
        require(address(specificComets[msg.sender]) != address(0), "User does not have an active loan.");
        _;
    }

    function getLoan(bytes memory sismoConnectResponse) public {
        require(address(specificComets[msg.sender]) == address(0), "User already has an active loan.");
        (uint16 creditScore, uint256 borrowable, uint16 interestRate) = estimateLoan(sismoConnectResponse); // We estimate loan and also check that user has digital identity and meets the requirements
        CometHelper cometUser = new CometHelper(_cometAddess);
        specificComets[msg.sender] = cometUser;
        // Provide the above contract with enough collateral from this treasury
        uint collateralAmount = borrowable*2; // For now, we just supply twice as much collateral to make everything easier but ideally we need a proper way which calls Compound for minimal borrowable amount etc.
        cometUser.supply(_collateralAsset, collateralAmount); // We supply collateral
        cometUser.withdraw(_borrowAsset, borrowable); // We get the borrowed amount to user's treasury
        // Send borrowed amount to the borrower (msg.sender)
    }

    // Constantly loop through it to check that health score is above 1.5, if not, send message to the user to repay the loan
    /*
        Determines how much the user must repay in order to get back on a healthy score;
    */
    function needToRepay() onlyBorrower public view returns(int, int) {
        CometHelper cometUser = specificComets[msg.sender];
        (int health, int repay) = cometUser.needToRepay(_collateralAsset);
        return (health, repay);
    }

    /*
        Repay back the borrowed amount
    */
    function repayInterestRate(uint amount) onlyBorrower public {
        specificComets[msg.sender].supply(_borrowAsset, amount);
    }

    function repayFull() onlyBorrower public { 
        specificComets[msg.sender].repayFullBorrow(_borrowAsset);
        delete specificComets[msg.sender]; 
        // Withdraw the collateral from Compound and transfer it back here to the main treasury
        // Emit an event that loan has been repaid successfully or display it somehow otherwise
    }

    function totalOwed() onlyBorrower public view returns(int){
        return specificComets[msg.sender].owed(); 
    }
}