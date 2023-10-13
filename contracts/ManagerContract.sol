// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@sismo-core/sismo-connect-solidity/contracts/SismoConnectLib.sol";
// Import Comet smart contract here

contract ManagerContract is SismoConnect { // inherits from Sismo Connect library
    event vaultIdReceived(uint256 value1);
    event HealthFactorChanged(address user, uint256 healthFactor);

    bytes16 private _appId = 0xf4977993e52606cfd67b7a1cde717069;
    Comet comet = Comet("0xCometAddress"); // Need to deploy a contract and provide it with the actual smart contract
    address public collateralERC20 = 0x123; //Dummy data
    address public borrowedERC20 = 0x123;
    address public destinationContract = 0x123;
    uint256 public healthFactorThreshold = 150e16; // 1.5 as the health factor threshold (150e16)

    mapping(address => uint256) public userCreditScore;
    mapping(address => CollateralTreasury) public collateralTreasuries;

    constructor()
        SismoConnect(buildConfig({appId: _appId})) // <--- Sismo Connect constructor
    {}

    function getAPR() public returns(uint256){
        uint secondsYear = 60 * 60 * 24 * 365;
        uint utilization = comet.getUtilization();
        uint borrowRate = comet.getBorrowRate(utilization);
        uint apr = borrowRate / (10 ^ 18) * secondsYear * 100; // Get anual interest rate
        return apr;
    }

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

    function getLoan(bytes memory sismoConnectResponse) public returns(address) {
        CollateralTreasury borrowersTreasury = new CollateralTreasury(msg.sender);
        collateralTreasuries[msg.sender] = borrowersTreasury;
        (uint16 creditScore, uint256 borrowable, uint16 interestRate) = estimateLoan(sismoConnectResponse);
        // we need to fund the newly created treasury 
        borrowersTreasury.getLoanWithCollateral(sismoConnectResponse);
        return address(borrowersTreasury);
    }
}

contract CollateralTreasury is ManagerContract { // Create a new contract to be used as a treasury for each collateral under which assets have been borrowed
    address private borrower;

    constructor(address _borrower) {
        borrower = _borrower;
    }
    
    function getLoanWithCollateral(bytes memory sismoConnectResponse) internal {
        (uint16 creditScore, uint256 borrowable, uint16 interestRate) = estimateLoan(sismoConnectResponse);
        // To prevent abuse, we should also set it to only one loan at a time per user
        uint256 amount = borrowable * 3; // Need to get a proper collateral factor for the asset but for simplicity, we just provide 3 times more collateral than we want to borrow

        // We need to somehow allow this contract to withdraw funds from the user's wallet anytime to pay the interest rate
        comet.supplyFrom(address(this), destinationContract, collateralERC20, amount); // We provide collateral to the protocol
        comet.withdrawFrom(destinationContract, borrower, borrowedERC20, borrowable); // The borrowed amount is sent to borrower
    }

    function repayLoan(uint256 amount) public {
        comet.supply(borrowedERC20, amount);
    }

    // Need to somehow constantly check if the contract is healthy (maybe a loop inside a view function or just a loop in frontend that constantly checks and then sends a message to user though a communication protocol)
    function health() public returns(uint){
        // Need to ensure that these two are in the same unit e.g. USDC
        uint owed = comet.borrowBalanceOf(address(this));
        uint collateral = comet.collateralBalanceOf(address(this), collateralERC20);
        uint healthFactor = collateral/owed;
        return healthFactor;
    }

    function needToPay() public returns(uint){
        uint owed = comet.borrowBalanceOf(address(this));
        uint collateral = comet.collateralBalanceOf(address(this), collateralERC20);
        uint healthFactor = collateral/owed;
        uint repay = (owed) - (collateral/healthFactor); // We find how much borrower needs to pay to get the loan back on a healthy ratio
        return repay;
    }
}