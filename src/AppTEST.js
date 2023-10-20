import logo from "./logo.svg";
import "./App.css";
import {
  SismoConnectButton,
  AuthType,
  ClaimType,
} from "@sismo-core/sismo-connect-react";
import { ethers } from "ethers";
import ABI from "./contracts/ABI.json";
import React, { useState } from "react";

function App() {
  const [connectedAddress, setConnectedAddress] = useState("");
  const contractAddress = "0xcc03EBBD6F7378aAbD010a8329bfE0e018771480";

  const handleConnectWallet = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        setConnectedAddress(accounts[0]);
      } else {
        throw new Error(
          "No Ethereum wallet found in your browser. Please install MetaMask or a compatible wallet."
        );
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      throw error;
    }
  };

  const callSismoContract = async (response) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, ABI, provider);
      console.log("Contract: ", contract);
      const result = await contract.doSomethingUsingSismoConnect(response); // Replace with the function name you want to call
      console.log("Function result:", result);
    } catch (error) {
      console.error("Error calling smart contract function:", error);
    }
  };

  const config = {
    appId: "0x70fa08c440c103a75df7bb076c84b99f",
    displayRawResponse: true, // this enables you to get access directly to the
    // Sismo Connect Response in the vault instead of redirecting back to the app
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <div>
          <h1>Connect Your Ethereum Wallet</h1>
          {connectedAddress ? (
            <p>Connected to Ethereum wallet: {connectedAddress}</p>
          ) : (
            <button onClick={handleConnectWallet}>Connect Wallet</button>
          )}
        </div>
        <SismoConnectButton
          config={config}
          // Auths = Data Source Ownership Requests
          auths={[
            // Anonymous identifier of the vault for this app
            // vaultId = hash(vaultSecret, appId).
            // full docs: https://docs.sismo.io/sismo-docs/build-with-sismo-connect/technical-documentation/vault-and-proof-identifiers
            // user is required to prove ownership of their vaultId for this appId
            { authType: AuthType.VAULT },
          ]}
          // Claims = prove group membership of a Data Source in a specific Data Group.
          // Data Groups = [{[dataSource1]: value1}, {[dataSource1]: value1}, .. {[dataSource]: value}]
          // When doing so Data Source is not shared to the app.
          claims={[
            {
              // claim Gitcoin Passport Holders Data Group membership: https://factory.sismo.io/groups-explorer?search=0x1cde61966decb8600dfd0749bd371f12
              // Data Group members          = Gitcoin Passport Holders
              // value for each group member = Gitcoin Passport Score
              // request user to prove membership in the group with value > 20
              groupId: "GITCOIN_PASSPORT_HOLDERS",
              value: 20,
              claimType: ClaimType.GTE,
            },
            {
              // claim Rocifi Credit Score Data Group membership: https://factory.sismo.io/groups-explorer?search=0xb3ac412738ed399acab21fbda9add42c
              // Data Group members          = eth addresses scored by Rocifi
              // value for each group member = Rocifi Credit Score 1-10
              groupId: "ROCIFI_CREDIT_HOLDERS",
              isSelectableByUser: true, // can reveal more than 1 if they want
              isOptional: true,
            },
          ]}
          // request message signature from users.
          signature={{ message: signMessage(address) }}
          // signature={{ message: "I approve that I'm a human and I'm unique." }}
          // retrieve the Sismo Connect Response from the user's Sismo data vault
          onResponseBytes={(response) => {
            console.log("Call Sismo Contract.");
            callSismoContract(response);
            //    call your contract/backend with the response as bytes
          }}
          text={"I approve that I'm a human and I'm unique."}
        />
      </header>
    </div>
  );
}

export default App;
