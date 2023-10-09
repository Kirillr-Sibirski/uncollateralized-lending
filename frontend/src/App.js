import logo from './logo.svg';
import './App.css';
import { SismoConnectConfig, SismoConnectButton, AuthType } from "@sismo-core/sismo-connect-react";
import { ethers } from 'ethers';
import ABI from "./contracts/ABI.json";
import React, { useState } from 'react';

function App() {
  const [connectedAddress, setConnectedAddress] = useState('');
  const contractAddress = '0x4D4344797E687357b57B0DF039881bFb85032866';

  const handleConnectWallet = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        setConnectedAddress(accounts[0]);
      } else {
        throw new Error('No Ethereum wallet found in your browser. Please install MetaMask or a compatible wallet.');
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      throw error;
    }
  };

  const callSismoContract = async (response) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, ABI, provider);
      const result = await contract.doSomethingUsingSismoConnect(response); // Replace with the function name you want to call
      console.log('Function result:', result);
    } catch (error) {
      console.error('Error calling smart contract function:', error);
    }
  }

  const config = {
    appId: "0x70fa08c440c103a75df7bb076c84b99f", 
  }
  const GITCOIN_PASSPORT_HOLDERS = "0x1cde61966decb8600dfd0749bd371f12";
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
              auths={[{ authType: AuthType.EVM_ACCOUNT }]}
              // claims={[{groupId: GITCOIN_PASSPORT_HOLDERS}]}
              signature={{message: "I approve that I'm a human and I'm unique."}}
              onResponseBytes={(response) => {
                callSismoContract(response);
                  // call your contract/backend with the response as bytes
              }}
          />
      </header>
    </div>
  );
}

export default App;
