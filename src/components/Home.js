import { SismoConnectButton, AuthType } from '@sismo-core/sismo-connect-react'
import { ethers } from 'ethers'
import ABI from '../contracts/ABI.json'
import ZKredit from '../assets/ZKredit.png'
import React, { useState } from 'react'

const Home = () => {
  const [connectedAddress, setConnectedAddress] = useState('')
  const contractAddress = '0xcc03EBBD6F7378aAbD010a8329bfE0e018771480'
  const [loanAmount, setLoanAmount] = useState(0)
  const [loanInterest, setLoanInterest] = useState(0)
  const [showLoan, setShowLoan] = useState(false)

  const handleConnectWallet = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        })
        setConnectedAddress(accounts[0])
      } else {
        throw new Error(
          'No Ethereum wallet found in your browser. Please install MetaMask or a compatible wallet.',
        )
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error)
      throw error
    }
  }

  const handleLoanEstimate = () => {
    setLoanAmount(100);
    setLoanInterest(10);
    setShowLoan(true);
  }

  const handleGetLoan = () => {}

  const callSismoContract = async (response) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const contract = new ethers.Contract(contractAddress, ABI, provider)
      console.log('Contract: ', contract)
      const result = await contract.doSomethingUsingSismoConnect(response) // Replace with the function name you want to call
      console.log('Function result:', result)
    } catch (error) {
      console.error('Error calling smart contract function:', error)
    }
  }

  const config = {
    appId: '0x70fa08c440c103a75df7bb076c84b99f',
  }
  const GITCOIN_PASSPORT_HOLDERS = '0x1cde61966decb8600dfd0749bd371f12'
  return (
    <div>
      <header className="App-header">
        <img src={ZKredit} alt="Logo" height={'60vh'} width={100} />
        <div>
          {connectedAddress ? (
            <p>Connected to Ethereum wallet: {connectedAddress}</p>
          ) : (
            <button onClick={handleConnectWallet} className="wallet-button">
              Connect Wallet
            </button>
          )}
        </div>
      </header>
      <div style={{ marginTop: 10, flexDirection: 'column', display: 'flex' }}>
        <div className="content-section" style={{margin: "10px 0px"}}>
          <SismoConnectButton
            config={config}
            auths={[{ authType: AuthType.EVM_ACCOUNT }]}
            claims={[{ groupId: GITCOIN_PASSPORT_HOLDERS }]}
            signature={{
              message: "I approve that I'm a human and I'm unique.",
            }}
            onResponseBytes={(response) => {
              console.log('Call Sismo Contract.')
              callSismoContract(response)
              // call your contract/backend with the response as bytes
            }}
          />
        </div>

        <div className="content-section">
          {showLoan ? <div style={{ flexDirection: 'column', display: 'flex' }}>
            <span className='loan-info'>
                Loan Amount: {loanAmount}
            </span>
            <span className='loan-info'>
                Interest rate: {loanInterest}% p.a.
            </span>
          </div> : <button onClick={handleLoanEstimate} className="action-button">
            Get Loan Estimate
          </button>}
        </div>

        <div className="content-section">
          <button onClick={handleGetLoan} className="action-button">
            Disburse Loan
          </button>
        </div>
      </div>
    </div>
  )
}

export default Home
