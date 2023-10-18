// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@sismo-core/sismo-connect-solidity/contracts/SismoConnectLib.sol";
import "./CometHelper.sol";

contract ManagerContract is SismoConnect { // inherits from Sismo Connect library
    bytes16 public constant GITCOIN_PASSPORT_HOLDERS =
        0x1cde61966decb8600dfd0749bd371f12;
    bytes16 public constant ROCIFI_CREDIT_HOLDERS =
        0xb3ac412738ed399acab21fbda9add42c;
    event ResponseVerified(SismoConnectVerifiedResult result);
    event vaultIdReceived(uint256 value1);

    bytes16 private _appId = 0xf4977993e52606cfd67b7a1cde717069;
    // allow impersonation
    bool private _isImpersonationMode = true; // remove later
    address public _collateralAsset =
        0x3EE77595A8459e93C2888b13aDB354017B198188; // Need proper address; This is just DUMMY data
    address public _borrowAsset = 0x3EE77595A8459e93C2888b13aDB354017B198188; // Need proper address; This is just DUMMY data
    mapping(address => CometHelper) public specificComets; //store user's comet contract address
    mapping(address => uint16) public creditScores; //store user's credit score

    constructor()
        SismoConnect(
            buildConfig({
                appId: _appId,
                isImpersonationMode: _isImpersonationMode
            })
        ) // <--- Sismo Connect constructor
    {}

    // frontend requests, backend verifies, but we need to recreate the request made in the fontend to verify the proof
    function verifySismoConnectResponse(bytes memory response) public {
        // Recreate the request made in the fontend to verify the proof
        // We will verify the Sismo Connect Response containing the ZK Proofs against it
        AuthRequest[] memory auths = new AuthRequest[](3);
        auths[0] = buildAuth({authType: AuthType.VAULT});
        auths[1] = buildAuth({authType: AuthType.EVM_ACCOUNT});
        auths[2] = buildAuth({
            authType: AuthType.EVM_ACCOUNT,
            userId: uint160(0xf4165cdD056E8ff4096d21555908982F8c0696B1) // will delete
        }); // will delete
        ClaimRequest[] memory claims = new ClaimRequest[](2);
        claims[0] = buildClaim({
            // claim Gitcoin Passport Holders Data Group membership
            groupId: GITCOIN_PASSPORT_HOLDERS,
            value: 20,
            claimType: ClaimType.GTE
        });
        claims[1] = buildClaim({
            // claim Rocifi Credit Score Data Group membership
            groupId: ROCIFI_CREDIT_HOLDERS,
            claimType: ClaimType.GTE,
            value: 1
        });

        // verify the response regarding our original request
        SismoConnectVerifiedResult memory result = verify({
            // SismoConnectVerifiedResult memory result = verify(response);
            responseBytes: response,
            auths: auths,
            claims: claims,
            signature: buildSignature({message: abi.encode(msg.sender)})
        });

        // if the proofs and signed message are valid, we take the userId from the verified result
        // in this case the userId is the vaultId (since we used AuthType.VAULT in the auth request),
        // it is the anonymous identifier of a user's vault for a specific app
        // --> vaultId = hash(userVaultSecret, appId)
        uint256 vaultId = SismoConnectHelper.getUserId(result, AuthType.VAULT);

        emit ResponseVerified(result);

        // Update credit score
        //uint8 rocifiValue = result.getValue(ROCIFI_CREDIT_HOLDERS);
        //uint16 newScore = calculateCreditScore(rocifiValue);
        //creditScores[msg.sender] += newScore;
    }

    function calculateCreditScore(
        uint8 rocifiValue
    ) private pure returns (uint16) {
        if (rocifiValue > 7) return 0;
        if (rocifiValue == 7 || rocifiValue == 8) return 2;
        if (rocifiValue == 6) return 4;
        if (rocifiValue == 5) return 5;
        if (rocifiValue == 4) return 6;
        if (rocifiValue == 3) return 8;
        if (rocifiValue == 2) return 9;
        if (rocifiValue == 1) return 10;
        return 0;
    }

    function getCreditScore(address user) public view returns (uint16) {
        return creditScores[user];
    }

    function estimateLoan(
        address user
    ) public view returns (uint16, uint256, uint256, uint256) {
        uint16 score = getCreditScore(user);
        uint256 interestRate;
        uint256 loanAmount;
        uint256 collateralAmount;

        // Loan conditions based on credit score
        if (score < 2) revert("Not eligible for loans.");
        else if (score < 4) {
            interestRate = 50;
            loanAmount = 5 ether;
            collateralAmount = (loanAmount * 150) / 100;
        } else if (score < 5) {
            interestRate = 20;
            loanAmount = 5 ether;
            collateralAmount = (loanAmount * 120) / 100;
        } else {
            interestRate = 50 - 5 * score;
            loanAmount = 5 ether + (score >= 9 ? 5 ether : 0);
            collateralAmount =
                (loanAmount * (10 >= score ? 10 - score : 0)) /
                10;
        }
        return (score, interestRate, loanAmount, collateralAmount);
    }
}

contract LoanFactory is ManagerContract, CometHelper(address(this)) { // This contract must be funded aka it is used as treasury
    ERC20 public token;

    event LiquidationEvent();

    constructor() {
        token = ERC20(_collateralAsset);
    }

    modifier onlyBorrower {
        require(address(specificComets[msg.sender]) != address(0), "User does not have an active loan.");
        _;
    }

    modifier onlyOwner {
        require(true, "Caller doesn't have enough permissions."); // Check who deployed the contract
        _;
    }

    function getLoan() public {
        require(address(specificComets[msg.sender]) == address(0), "User already has an active loan.");
        (
            uint16 creditScore,
            uint256 interestRate,
            uint256 borrowable,
            uint256 collateral
        ) = estimateLoan(msg.sender); // We estimate loan and also check that user has digital identity and meets the requirements

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
        We can do a loop off-chain to actually check it. Probably will have to run node.js server to constanly kick this function but it also means that it will have to rn thorugh every single one of the 
        loans which is not gas efficient at all, as we are on testnet right now, we don't really care. And I'm sure this will do the trick for the hackathon but for future we will for sure need something 
        more efficient.
        These 3 functions are going to be monitored off-chain (node.js server).
    */
    function checkRepay(address user) public view returns(int, int) { 
        CometHelper cometUser = specificComets[user];
        (int health, int repay) = cometUser.needToRepay(_collateralAsset);
        return (health, repay);
    }
    function checkLiquitable(address user) public view returns(bool) {
        CometHelper cometUser = specificComets[user];
        return cometUser.liquitable();
    }
    function checkPayment(address user) public view returns(uint, uint) {
        // Most likely will have to return paymentDue and current block.timestamp and check these two things off-chain, if the payment date is missed by 1 day, it's one punishment, if it's more, it's a worse punishment
        CometHelper cometUser = specificComets[user];
        return(block.timestamp, cometUser.paymentDue());
    }

    /*
        These events are going to be called off-chain after the above functions are monitored
    */
    function liquidateEvent(address user) public onlyOwner {
        // Downgrade credit score (a lot)
        CometHelper cometUser = specificComets[user];
        cometUser.withdrawToUser(_collateralAsset, MAX_UINT, address(this));
    }
    function overduePaymentEvent(address user, uint day) public onlyOwner {
        require((block.timestamp-overdueCharged)/86400 >= 1, "Overdue can only be charged with 1 day intervals."); // Checking to ensure that at least 1 day has passed since we last charged borrower with overdue payment
        CometHelper cometUser = specificComets[user];
        cometUser.setIsOverdue(true);
        cometUser.setOverdueCharged(block.timestamp);
        // Downgrade credit score (depending on how many days)
    }
    function repayDueDay(address user) public onlyOwner {
        CometHelper cometUser = specificComets[user];
        cometUser.setRepayDue(block.timestamp+86400); // Reset the repay date
    } 

    /*
        Repay back the borrowed amount
    */
    function repayInterestRate(uint amount) onlyBorrower public payable {
        (int health, int repay) = checkRepay(msg.sender);
        require(int(amount) >= repay, "Not enough to cover the interest rate.");
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed. Ensure you've approved this contract."
        );

        token.transferFrom(address(this), address(specificComets[msg.sender]), amount/2);

        specificComets[msg.sender].supply(_borrowAsset, amount/2);
        CometHelper cometUser = specificComets[msg.sender];
        cometUser.setIsOverdue(false);
    }

    function repayFull() onlyBorrower public payable { 
        int owedAmount = owed();
        require(
            token.transferFrom(msg.sender, address(this), uint(owedAmount)), // With full commission
            "Transfer failed. Ensure you've approved this contract."
        );

        token.transferFrom(address(this), address(specificComets[msg.sender]), uint(owedAmount/2));
        specificComets[msg.sender].repayFullBorrow(_borrowAsset, _collateralAsset);
        delete specificComets[msg.sender]; 
    }

    function totalOwed() onlyBorrower public view returns(int){
        return specificComets[msg.sender].owed()*2; // With 50% commission 
    }
}