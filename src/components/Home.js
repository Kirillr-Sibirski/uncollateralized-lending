import {
  SismoConnectButton,
  ClaimType,
  AuthType,
} from '@sismo-core/sismo-connect-react'
import { ethers } from 'ethers'
import ABI from '../contracts/LoanFactoryABI.json'
import managerABI from '../contracts/ManagerFactoryABI.json'
import usdcABI from '../contracts/usdcABI.json'
import React, { useEffect, useState } from 'react'
import HowItWorks from '../assets/HowItWorks.png'
import Compound from '../assets/compound-logo.png'
import Sismo from '../assets/sismo-logo.png'
import Push from '../assets/push-logo.jpeg'


const EthInWei = 1000000000000000000;

const Home = () => {
  const [connectedAddress, setConnectedAddress] = useState(null)
  const contractAddress = '0xC2eDd4C8fD6ae11bD209e3eE7cC0B60159A92663'
  const managerContractAddr = '0x6B73EEE565f2c4982fb9d481590e765DC2b98786'

  const usdcContractAddr = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
  const GITCOIN_PASSPORT_HOLDERS = '0x1cde61966decb8600dfd0749bd371f12'
  const ROCIFI_CREDIT_HOLDERS = '0xb3ac412738ed399acab21fbda9add42c'

  const provider = new ethers.providers.Web3Provider(window.ethereum)

  const [loanAmount, setLoanAmount] = useState(0)
  const [creditScore, setCreditScore] = useState(0)
  const [loanInterest, setLoanInterest] = useState(0)
  const [showLoan, setShowLoan] = useState(false)
  const [loanExists, setLoanExists] = useState(false)
  const [pendingAmount, setPendingAmount] = useState(0);
  const [healthRatio, setHealthRatio] = useState(0);
  const [collateralAmount, setCollateralAmount] = useState(0)
  const [sismoResp, setSismoResp] = useState(0)
  const [signedContract, setSignedContract] = useState(null)
  const [managerContract, setManagerContract] = useState(null)
  const [baseTokenContract, setBaseTokenContract] = useState(null)
  const [timeOverdue, setTimeOverdue] = useState(0);

  const getCurrentAccount = async () => {
    const { ethereum } = window;

    const accounts = await ethereum.request({ method: "eth_accounts" });

    if (!accounts || accounts?.length === 0) {
      return null;
    }
    const account = accounts[0];
    setConnectedAddress(account);
  };

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

  const handleDisburseLoan = async () => {
    const txnHash = await signedContract.getLoan(sismoResp);
    await txnHash.wait();
    const totalOwed = await signedContract.totalOwed(connectedAddress);
    const repay = await signedContract.checkRepay(connectedAddress);
    const overdue = await signedContract.checkPayment(connectedAddress);
    setLoanAmount(totalOwed);
    setPendingAmount(repay[1]);
    setHealthRatio(repay[0]);
    setTimeOverdue((overdue[0] - overdue[1])/1000);
    setLoanExists(true);
  }

  const handleRepayFullLoan = async () => {
    if (!connectedAddress || !pendingAmount) {
      return
    }
    const owed = await signedContract.totalOwed();
    // Need to approve the transfer of funds first
    const txnHashToken = await baseTokenContract.approve(contractAddress, owed);
    await txnHashToken.wait();
    const txnHash = await signedContract.repayFull();
    await txnHash.wait();
  }

  const handleRepayLoan = async () => {
    if (!connectedAddress || !pendingAmount) {
      return
    }
    console.log(connectedAddress);
    const repay = await signedContract.checkRepay(connectedAddress);
    console.log(repay);
    // Need to approve the transfer of funds first
    const txnHashToken = await baseTokenContract.approve(contractAddress, repay);
    await txnHashToken.wait();
    const txnHash = await signedContract.repayInterestRate();
    await txnHash.wait();
  }

  const callSismoContract = async (response) => {
    try {// Replace with the function name you want to call
      console.log("Connected address: ", connectedAddress)
      console.log("response: ",response)
      setSismoResp(response);
    } catch (error) {
      console.error('Error calling smart contract function:', error)
    }
  }

  const getLoanEstimate = async () => {
    //const result = await managerContract.estimateLoan();
    console.log(sismoResp)
    const result = await managerContract.verifySismoConnectResponse(ethers.utils.toUtf8Bytes(sismoResp));
    console.log("Result: ",result)
    setShowLoan(true);
    // setCreditScore(result[0])
    // setLoanInterest(result[1]);
    // setLoanAmount(result[2]);
    // setCollateralAmount(result[3])
  }

  useEffect(()=>{
    if(sismoResp && connectedAddress && managerContract){
      getLoanEstimate();
    }
  }, [sismoResp, connectedAddress, managerContract])
  useEffect(() => {
    getCurrentAccount();
  }, [])

  useEffect(() => {
    if (connectedAddress) {
      const signer = provider.getSigner();
      setSignedContract(new ethers.Contract(contractAddress, ABI, signer))
      setManagerContract(new ethers.Contract(managerContractAddr, managerABI, signer))
      setBaseTokenContract(new ethers.Contract(usdcContractAddr, usdcABI, signer)); 
    }
  }, [connectedAddress])

  async function checkLoanExists () {
    const loan = await signedContract.specificComets(connectedAddress);
    if(parseInt(loan, 16) == 0){
      setShowLoan(false);
      setLoanExists(false);
    } else {
      const totalOwed = await signedContract.totalOwed();
      const repay = await signedContract.checkRepay(connectedAddress);
      const overdue = await signedContract.checkPayment(connectedAddress);
      setLoanAmount(totalOwed);
      setPendingAmount(repay[1]);
      setHealthRatio(repay[0]);
      setTimeOverdue((overdue[0] - overdue[1])/1000);
      setLoanExists(true);
    }
  }

  useEffect(() => {
    if (signedContract) {
      checkLoanExists();
    }
  }, [signedContract])

  const config = {
    appId: '0x70fa08c440c103a75df7bb076c84b99f',
    vault: {
      // For development purposes insert the identifier that you want to impersonate here
      // Never use this in production
      impersonate: [
        "0xba0e13b23b2d5fd5cb80544a34345fd370151179", // gitcoin score of 42, should allow user to get loan
        "0x2b787a5993cf3a17c02809df0b44d0bc8c7fd8ef", // rocifi score of 2, should give user 9 points
      ], 
    },
    displayRawResponse: false, // this enables you to get access directly to the
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
            <a href="https://push.org/">
              <img
                src={Push}
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
            style={{ color: '#82B7DC', flex: 1 }}
          >
            <h2>{loanExists ? 'Your Loan Details' : 'GET STARTED'}</h2>
          </div>

          <div
            className="content-section"
            style={{ color: '#82B7DC', flex: 3 }}
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
                {/* <span className="loan-info">
                  Interest accumulated till date: {loanInterestAmount}
                </span>
                <span className="loan-info">Amount Paid: {amountPaid}</span> */}
                <span className="loan-info">
                  Health Ratio: {healthRatio}
                </span>
                <span className="loan-info">
                  Amount pending to be paid:{' '}
                  {pendingAmount}
                </span>
                <span className="loan-info">
                  Time Overdue: {timeOverdue}
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
                <span className="loan-info">Trust Score: {creditScore}</span>
                <span className="loan-info">Loan Amount: {loanAmount}</span>
                <span className="loan-info">
                  Interest rate: {loanInterest}% p.a.
                </span>
                <span className="loan-info">
                  Collateral Amount: {collateralAmount}
                </span>
                <span className="loan-description">
                  {collateralAmount
                    ? "You don't have the required trust score yet for a collateral free loan"
                    : 'Yay! You are eligible for a collateral free loan'}
                </span>
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
                <button onClick={handleRepayLoan} className="action-button">
                  Repay Loan
                </button>
                <button onClick={handleRepayFullLoan} className="action-button">
                  Repay Full Loan
                </button>
              </div>
            ) : showLoan ? (
              <button onClick={handleDisburseLoan} className="action-button">
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
                  // call your contract/backend with the response as bytes
                }}
              //   onResponse={function(response) {
              //     fetch("/api/verify", {
              //       method: "POST",
              //       body: JSON.stringify(response),
              //     })
              //     .then(res => res.json())
              //     .then(data => console.log(data));
              // }}}

                overrideStyle={{
                  backgroundColor: "#3466AA",
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
