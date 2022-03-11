import React, { useEffect, useState } from 'react'
import logo from './logo.svg'
import './App.scss'
import Button from '@material-ui/core/Button';
import { Contract, ethers } from "ethers";
import TextField  from '@material-ui/core/TextField';
import CircularProgress  from '@material-ui/core/CircularProgress';
import ReactJson from 'react-json-view'

const METAMASK_LOGO = 'https://raw.githubusercontent.com/MetaMask/brand-resources/c3c894bb8c460a2e9f47c07f6ef32e234190a7aa/SVG/metamask-fox.svg'
type StateType = { [key: string]: any }
type Loading = 'IDLE' | 'PROCESSING' | 'SUCESS' | 'FAIL';

function App() {

  const [states, setStates] = useState<StateType>({
    provider: null,
    signer: null,
    address: null,
    balance: null,
  })

  const [contract, setContract] = useState<StateType>({
    address: '0x48741D09A695c90174084925492a2a65e7CCe4d4',
    messageInput: '',
    contractSavingBtnStatus: 'IDLE',
    valueInput: '',
    data: null,
    contractGetingBtnStatus: 'IDLE',
    contractConnectingBtnLoading: false,
    contract: null,
    events: [],
  })


  const connetingToMetaMask = async () => {
    // @ts-ignore
    const provider = new ethers.providers.Web3Provider(window.ethereum)

    // MetaMask requires requesting permission to connect users accounts
    await provider.send("eth_requestAccounts", []);
    
    // The MetaMask plugin also allows signing transactions to
    // send ether and pay to change state within the blockchain.
    // For this, you need the account signer...
    const signer = provider.getSigner()

    setStates({
      ...states,
      provider,
      signer,
      address: await signer.getAddress(),
      balance: ethers.utils.formatEther(await provider.getBalance(await signer.getAddress())) // ether
    })
  }

  const saveDataToContract = async () => {

    const address = contract.address;
    const messageInput = contract.messageInput;
    const valueInput = Number(contract.valueInput);

    if (
      !address ||
      !messageInput || 
      !valueInput ||
      typeof valueInput !== 'number'
    ) {
      return setContract({
        ...contract,
        contractSavingBtnStatus: 'FAIL',
        messageInput: '',
        valueInput: ''
      })
    }

    setContract({
      ...contract,
      contractSavingBtnStatus: 'PROCESSING'
    })

    const abi = [
      'function setMessage(string calldata _message) external',
      'function getMessage() public view returns(string memory)',
      'function setData(string calldata _message, uint _value) external',
      'function getData() public view returns(string memory, uint)',

      'event MessageSaved(string message)',
      'event DataSaved(string message, uint value)'
    ]

    const contractObject = new ethers.Contract(address, abi, states.provider);

    const contractWithSigner = contractObject.connect(states.signer);

    await contractWithSigner.setData(messageInput, valueInput);

    setContract({
      ...contract,
      contractSavingBtnStatus: 'SUCCESS'
    })
  }

  const getDataFromContract = async () => {
    const address = contract.address;

    if (!address) setContract({
      ...contract,
      contractGetingBtnStatus: 'FAIL',
    })

    setContract({
      ...contract,
      contractGetingBtnStatus: 'PROCESSING',
    })

    const abi = [
      'function setMessage(string calldata _message) external',
      'function getMessage() public view returns(string memory)',
      'function setData(string calldata _message, uint _value) external',
      'function getData() public view returns(string memory, uint)',

      'event MessageSaved(string message)',
      'event DataSaved(string message, uint value)'
    ]

    const contractObject = new ethers.Contract(address, abi, states.provider);

    const contractWithSigner = contractObject.connect(states.signer);

    const data = await contractWithSigner.getData();

    setContract({
      ...contract,
      data,
      contractGetingBtnStatus: 'SUCCESS'
    })
  }

  // @ts-ignore
  useEffect(async () => {
    if (states.signer) {
      setContract({
        ...contract,
        contractConnectingBtnLoading: true
      })

      const address = contract.address;

      const abi = [
        'function setMessage(string calldata _message) external',
        'function getMessage() public view returns(string memory)',
        'function setData(string calldata _message, uint _value) external',
        'function getData() public view returns(string memory, uint)',
  
        'event MessageSaved(string message)',
        'event DataSaved(string message, uint value)'
      ]

      const contractObject = new ethers.Contract(address, abi, states.provider);

      setContract({
        ...contract,
        contract: contractObject,
        contractConnectingBtnLoading: false,
      })


      contractObject.on("DataSaved", (message: string, unit: number, event: any) => {

        setContract(oldState => {
          return {
            ...oldState,
            events: [{message}, ...oldState.events]
          }
        })
      })

    }
  }, [states.signer])

  return (
    <div className="App">
      <header className="App-header">

      {
        !states.signer
        ? 
          <Button variant='contained' color="primary" onClick={connetingToMetaMask}>Connect to Metamask</Button>
        : 
        <article>
          <img src={METAMASK_LOGO} width={100} />
          <div>{states.address}</div>
          <div>{states.balance} (eth)</div>
          <Button variant='contained' color="primary">Connected</Button>
        </article>
      }


      {
        contract.contract
        &&
          <article>
            <h2>Interact with contract</h2>
            <h3 className='contract-address'>Contract address {contract.address}</h3>
            
            <form 
              autoComplete='off' 
              className='set-data-to-contract'  
            >
              <h3>Set data to contract:</h3>
              <TextField 
                id="message" 
                label="Message" 
                variant="outlined" 
                value={contract.messageInput}
                onChange={e => {
                  setContract({
                    ...contract,
                    messageInput: e.target.value,
                  })
                }}  
              />
              <TextField 
                id="value" 
                label="Value" 
                variant="outlined" 
                type='number'
                value={contract.valueInput}  
                onChange={e => {
                  setContract({
                    ...contract,
                    valueInput: e.target.value,
                  })
                }}
              />

              {(() => {
                switch (contract.contractSavingBtnStatus) {
                  case 'IDLE':
                    return <Button 
                      variant="contained" 
                      color="primary"
                      onClick={saveDataToContract}  
                    >Save data to contract</Button>
                  case 'PROCESSING':
                    return <div className='button-loading'> 
                      <Button 
                        variant="contained"
                        disabled={true}
                      >
                        Processing
                      </Button>
                      <CircularProgress className='button-loading-second-ele' size={24} />
                    </div>
                  case 'SUCCESS':
                    return <Button 
                      variant="contained" 
                      color="primary"
                      onClick={() => {
                        setContract({
                          ...contract,
                          contractSavingBtnStatus: 'IDLE',
                          messageInput: '',
                          valueInput: '',
                        })
                      }}  
                    >Saving success</Button>
                  case 'FAIL':
                    return <Button 
                      variant="contained" 
                      color="secondary"
                      onClick={() => {
                        setContract({
                          ...contract,
                          contractSavingBtnStatus: 'IDLE',
                          messageInput: '',
                          valueInput: ''
                        })
                      }}    
                    >Saving fail</Button>
                }
              })()}

      
            </form>
          </article>
      }

      {
        contract.contract
        &&
        <article>
          <h3>Get data from contract</h3>

          {(() => {
            switch (contract.contractGetingBtnStatus) {
              case 'IDLE':
                return <Button 
                  variant="contained" 
                  color="primary"
                  onClick={getDataFromContract}  
                >Start get</Button>
              case 'PROCESSING':
                return <div className='button-loading'> 
                  <Button 
                    variant="contained"
                    disabled={true}
                  >
                    Processing
                  </Button>
                  <CircularProgress className='button-loading-second-ele' size={24} />
                </div>
              case 'SUCCESS':
                return <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    setContract({
                      ...contract,
                      contractGetingBtnStatus: 'IDLE',
                      messageInput: '',
                      valueInput: '',
                      data: null
                    })
                  }}  
                >Geting success</Button>
              case 'FAIL':
                return <Button 
                  variant="contained" 
                  color="secondary"
                  onClick={() => {
                    setContract({
                      ...contract,
                      contractGetingBtnStatus: 'IDLE',
                      messageInput: '',
                      valueInput: ''
                    })
                  }}    
                >Geting fail</Button>
            }
          })()}

          { contract.data &&  <ReactJson theme="monokai" src={contract.data} />}
        </article>
      }

      {
        contract.contract
        && 
        <article className='events'>
          <h3>Events of contract</h3>
          {
            contract.events.map((event, inde) => {
              return <div key={inde}>
                DataSaved Event with message: {event.message}
              </div>
            })
          }
        </article>
      }

      {
        contract.contractConnectingBtnLoading 
        &&
        <div className='button-loading'>
          <Button variant='contained' disabled={true}>Connecting to contract ...</Button>
          <CircularProgress className='button-loading-second-ele' size={24} />
        </div>
      }
     
      </header>
    </div>
  )
}

export default App
