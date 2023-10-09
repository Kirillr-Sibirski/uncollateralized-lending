// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "@sismo-core/sismo-connect-solidity/contracts/SismoConnectLib.sol";

contract ManagerContract is SismoConnect { // inherits from Sismo Connect library
 
    bytes16 private _appId = 0xf4977993e52606cfd67b7a1cde717069;

    // call SismoConnect constructor with your appId
    constructor() SismoConnect(buildConfig(_appId)) {}

    function doSomethingUsingSismoConnect(bytes memory sismoConnectResponse) public view {    
        SismoConnectVerifiedResult memory result = verify({
            responseBytes: sismoConnectResponse,
            auth: buildAuth({authType: AuthType.EVM_ACCOUNT}),
            claim: buildClaim({groupId: 0x42c768bb8ae79e4c5c05d3b51a4ec74a}),
            // we also want to check if the signed message provided in the response is the signature of the user's address
            signature:  buildSignature({message: abi.encode(msg.sender)})
        });

        uint256 vaultId = SismoConnectHelper.getUserId(result, AuthType.EVM_ACCOUNT);
        // do something with this vaultId for example
        
    }
}