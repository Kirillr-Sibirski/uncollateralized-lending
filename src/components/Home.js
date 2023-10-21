import {
  SismoConnectButton,
  ClaimType,
  AuthType,
} from '@sismo-core/sismo-connect-react'
import { ethers } from 'ethers'
import ABI from '../contracts/ABI.json'
import React, { useState } from 'react'
import HowItWorks from '../assets/HowItWorks.png'
import Compound from '../assets/compound-logo.png'
import Sismo from '../assets/sismo-logo.png'
import Xmtp from '../assets/xmtp-logo.svg'

const Home = () => {
  const [connectedAddress, setConnectedAddress] = useState('')
  const contractAddress = '0xcc03EBBD6F7378aAbD010a8329bfE0e018771480'
  const GITCOIN_PASSPORT_HOLDERS = '0x1cde61966decb8600dfd0749bd371f12'
  const ROCIFI_CREDIT_HOLDERS = '0xb3ac412738ed399acab21fbda9add42c'

  const [loanAmount, setLoanAmount] = useState(0)
  const [loanInterest, setLoanInterest] = useState(0)
  const [showLoan, setShowLoan] = useState(true)
  const [loanExists, setLoanExists] = useState(false)
  const [loanInterestAmount, setLoanInterestAmount] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [amount, setAmount] = useState(0)
  const [collateralAmount, setCollateralAmount] = useState(0)

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
    setLoanAmount(100)
    setLoanInterest(10)
    setShowLoan(true)
  }

  const handleGetLoan = () => {}

  const handleRepayLoan = () => {
    if (!amount || amount > loanAmount + loanInterestAmount - amountPaid) {
      return
    }
  }

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
    vault: {
      // For development purposes insert the identifier that you want to impersonate here
      // Never use this in production
      impersonate: [
        '0x4b83c3caf46c82a2c755242732a28fd296a9db4b',
        '0xa3a7b6a06b128be64a099c7fed49d778008eb48a',
      ],
    },
    displayRawResponse: true, // this enables you to get access directly to the
    // Sismo Connect Response in the vault instead of redirecting back to the app
  }

  return (
    <div style={{ height: '100vh' }}>
      <header className="App-header">
        <div style={{ paddingLeft: 20 }}>
          <span
            style={{ fontSize: 'larger', color: '#114084', fontWeight: 'bold' }}
          >
            ZK
          </span>
          <span
            style={{ fontSize: 'larger', color: '#3466AA', fontWeight: 'bold' }}
          >
            redit
          </span>
        </div>
        <div style={{ paddingRight: 20 }}>
          {connectedAddress ? (
            <div>
              <span
                style={{
                  color: '#82B7DC',
                  fontSize: 'medium',
                  fontWeight: 'bold',
                }}
              >
                Connected to:{' '}
              </span>
              <span
                style={{
                  color: 'black',
                  fontSize: 'large',
                  backgroundColor: '#82B7DC',
                  borderRadius: '10px',
                  padding: '4px 8px',
                  color: 'white',
                }}
              >
                {connectedAddress}
              </span>
            </div>
          ) : (
            <button onClick={handleConnectWallet} className="wallet-button">
              Connect Wallet
            </button>
          )}
        </div>
      </header>
      <div
        style={{
          flexDirection: 'column',
          display: 'flex',
          width: '70vw',
          marginTop: '10vh',
        }}
      >
        <div className="intro">
          <h3>Welcome to</h3>
          <h1>Uncollaterised Loans</h1>
          <h2>For Decentralised Finance</h2>
          <span>
            ZKredit tries to solve the problem of overcollateralization in DeFi.
            It uses your on-chain and off-chain information to create a trust
            score and based on this trust score it decides whether you are
            eligible for an uncollaterised loan or not. All this while
            leveraging the power of zero knowledge proofs to make sure you
            privacy is not compromised.
          </span>
        </div>
        <div className="how-it-works">
          <h2>How it works</h2>
          <img src={HowItWorks} />
        </div>
        <div className="powered-by">
          <h4>Powered by:</h4>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignContent: 'center',
              justifyContent: 'center',
            }}
          >
            <a href="https://www.sismo.io/">
              <img
                src={Sismo}
                height={50}
                width={90}
                style={{ marginInline: 20 }}
              />
            </a>
            <a href="https://compound.finance/">
              <img
                src={Compound}
                height={50}
                width={90}
                style={{ marginInline: 20 }}
              />
            </a>
            <a href="https://xmtp.org/">
              <img
                src={Xmtp}
                height={50}
                width={90}
                style={{ marginInline: 20 }}
              />
            </a>
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '30vw',
          height: '90vh',
        }}
      >
        <div
          style={{
            flexDirection: 'column',
            display: 'flex',
            padding: '30px',
            backgroundColor: '#F1F1F1',
            height: 'inherit',
          }}
        >
          <div
            className="content-section"
            style={{ color: '#82B7DC', flex: 2 }}
          >
            <h2>{loanExists ? 'Your Loan Details' : 'GET STARTED'}</h2>
          </div>

          <div
            className="content-section"
            style={{ color: '#82B7DC', flex: 4 }}
          >
            {loanExists ? (
              <div
                style={{
                  flexDirection: 'column',
                  display: 'flex',
                  color: '#82B7DC',
                  fontWeight: 'bold',
                }}
              >
                <span className="loan-info">
                  Total amount borrowed: {loanAmount}
                </span>
                <span className="loan-info">
                  Interest rate: {loanInterest}% p.a.
                </span>
                <span className="loan-info">
                  Interest accumulated till date: {loanInterestAmount}
                </span>
                <span className="loan-info">Amount Paid: {amountPaid}</span>
                <span className="loan-info">
                  Amount pending to be paid:{' '}
                  {loanAmount + loanInterestAmount - amountPaid}
                </span>
              </div>
            ) : showLoan ? (
              <div
                style={{
                  flexDirection: 'column',
                  display: 'flex',
                  color: '#82B7DC',
                  fontWeight: 'bold',
                }}
              >
                <span className="loan-description">
                  Based on the ZK proofs provided and your previous credit
                  history. Following are the details about the loan that you are
                  eligible for:
                </span>
                <span className="loan-info">Loan Amount: {loanAmount}</span>
                <span className="loan-info">
                  Interest rate: {loanInterest}% p.a.
                </span>
                <span className="loan-info">Collateral Amount: {collateralAmount}</span>
                <span className="loan-description">
                  {collateralAmount 
                  ? "You don't have the required trust score yet for a collateral free loan"
                  : "Yay! You are eligible for a collateral free loan"}</span>
              </div>
            ) : (
              <p className="description">
                If you are here for the first time, get an estimate of the loan
                amount you are eligible for and the corresponding interest rate.
                If you already have a loan you can check the details of your
                loan and repay the pending amount. To continue, sign in with
                sismo.
              </p>
            )}
          </div>

          <div
            className="content-section"
            style={{ color: '#82B7DC', flex: 3 }}
          >
            {loanExists ? (
              <div className="repay-section">
                <input
                  type="number"
                  placeholder="Amount to repay"
                  className="amount-input"
                  onChange={(event) => setAmount(event.target.value)}
                />
                <button onClick={handleRepayLoan} className="action-button">
                  Repay Loan
                </button>
              </div>
            ) : showLoan ? (
              <button onClick={handleGetLoan} className="action-button">
                Disburse Loan
              </button>
            ) : (
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
                    groupId: GITCOIN_PASSPORT_HOLDERS,
                    value: 20,
                    claimType: ClaimType.GTE,
                  },
                  {
                    // claim Rocifi Credit Score Data Group membership: https://factory.sismo.io/groups-explorer?search=0xb3ac412738ed399acab21fbda9add42c
                    // Data Group members          = eth addresses scored by Rocifi
                    // value for each group member = Rocifi Credit Score 1-10
                    groupId: ROCIFI_CREDIT_HOLDERS,
                    isSelectableByUser: true, // can reveal more than 1 if they want
                    isOptional: true,
                  },
                ]}
                // request message signature from users.
                signature={{
                  message: "I approve that I'm a human and I'm unique.",
                }}
                // retrieve the Sismo Connect Response from the user's Sismo data vault
                onResponseBytes={(response) => {
                  console.log('Call Sismo Contract.')
                  callSismoContract(response)
                  //    call your contract/backend with the response as bytes
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
