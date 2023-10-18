// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@sismo-core/sismo-connect-solidity/contracts/SismoConnectLib.sol";
import "./CometHelper.sol";

import "./ERC20.sol";

contract ManagerContract is SismoConnect {
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
    mapping(address => uint256) public loanDueDates; // track loan repayment dates

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
            claimType: ClaimType.GTE,
            value: 20,
            isSelectableByUser: true
        });
        claims[1] = buildClaim({
            // claim Rocifi Credit Score Data Group membership
            groupId: ROCIFI_CREDIT_HOLDERS,
            claimType: ClaimType.GTE,
            value: 1,
            isSelectableByUser: true
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
        uint256 vaultId = result.getUserId(AuthType.VAULT);
        // uint256 vaultId = SismoConnectHelper.getUserId(result, AuthType.EVM_ACCOUNT);

        emit ResponseVerified(result);

        // Update credit score
        uint8 rocifiValue = result.getValue(ROCIFI_CREDIT_HOLDERS);
        uint16 newScore = calculateCreditScore(rocifiValue);
        creditScores[msg.sender] += newScore;
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

// This contract must be funded aka it is used as treasury
contract LoanFactory is ManagerContract, ERC20, CometHelper(address(this)) {
    using SafeMath for uint256;

    ERC20 public token;

    modifier onlyBorrower() {
        require(
            address(specificComets[msg.sender]) != address(0),
            "User does not have an active loan."
        );
        _;
    }

    constructor() {
        token = ERC20(_collateralAsset);
    }

    function getLoan(bytes memory sismoConnectResponse) public {
        require(
            address(specificComets[msg.sender]) == address(0),
            "User already has an active loan."
        );
        (
            uint16 creditScore,
            uint256 borrowable,
            uint16 interestRate
        ) = estimateLoan(sismoConnectResponse); // We estimate loan and also check that user has digital identity and meets the requirements
        uint collateralAmount = borrowable * 2; // For now, we just supply twice as much collateral to make everything easier but ideally we need a proper way which calls Compound for minimal borrowable amount etc.
        require(
            address(this).balance >= collateralAmount,
            "Not enough funds in the factory contract."
        );
        CometHelper cometUser = new CometHelper(address(this));
        specificComets[msg.sender] = cometUser;
        require(
            token.transfer(address(cometUser), collateralAmount),
            "Token transfer to user's treasury failed."
        );
        cometUser.supply(_collateralAsset, collateralAmount); // We supply collateral
        cometUser.withdrawToUser(_borrowAsset, borrowable, msg.sender); // We get the borrowed amount to user's treasury
    }

    /*
        Determines how much the user must repay in order to get back on a healthy score;
    */
    // We can do a loop on frontend side.
    function needToRepay() public view onlyBorrower returns (int, int) {
        CometHelper cometUser = specificComets[msg.sender];
        (int health, int repay) = cometUser.needToRepay(_collateralAsset);
        if (liquitable()) {
            // that means that the collateral is most likely to be liquidated -> defaulted
            // Send the message to user to liquidate
            // Downgrade credit score
            // We also withdraw all the remaining collateral here
        }
        if (block.timestamp > cometUser.paymentDue()) {
            // If payment was overdue by 1 day
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
    function repayInterestRate(uint amount) public payable onlyBorrower {
        require(
            token.transferFrom(
                msg.sender,
                address(specificComets[msg.sender]),
                amount
            ),
            "Transfer failed. Ensure you've approved this contract."
        );
        specificComets[msg.sender].supply(_borrowAsset, amount);
        CometHelper cometUser = specificComets[msg.sender];
        cometUser.setRepayDue(block.timestamp + 86400); // Reset the repay date
    }

    function repayFull() public payable onlyBorrower {
        int owedAmount = owed();

        require(
            token.transferFrom(
                msg.sender,
                address(specificComets[msg.sender]),
                uint(owedAmount)
            ),
            "Transfer failed. Ensure you've approved this contract."
        );
        specificComets[msg.sender].repayFullBorrow(
            _borrowAsset,
            _collateralAsset
        );
        delete specificComets[msg.sender];
    }

    function totalOwed() public view onlyBorrower returns (int) {
        return specificComets[msg.sender].owed();
    }
}
