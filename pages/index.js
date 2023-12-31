import Head from 'next/head'
import styles from '../styles/Home.module.css'
import {useEffect, useState, useRef} from "react"
import Web3Modal from "web3modal"
import { providers, BigNumber, utils, Contract } from "ethers";
import {TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI} from "../constants"


export default function Home() {
  const zero = BigNumber.from(0)
  const [walletConnected, setWalletConnected] = useState(false);
  const [tokensMinted, setTokensMinted] = useState(zero);
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(zero)
  const [tokenAmount, setTokenAmount] = useState(zero)
  const [loading, setLoading] = useState(false)
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero)
  const [isOwner, setIsOwner] = useState(false)
  const web3ModalRef = useRef();

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();

    if (chainId !== 11155111) {
      window.alert("Change the network to Sepolia");
      throw new Error("Change network to Sepolia");
    }

    if(needSigner) {
      const signer = web3Provider.getSigner();
      return signer
    }
    return web3Provider;
  }

  const connectWallet = async () => {
    try {
      await getProviderOrSigner()
      setWalletConnected(true)
    } catch (error) {
      console.error(error)
    }
  }

  const getTokensToBeClaimed = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, provider);
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);
      const signer = await getProviderOrSigner(true)
      const address = await signer.getAddress()
      const balance = await nftContract.balanceOf(address);

      if(balance === zero) {
        setTokensToBeClaimed(zero)
      } else {
        let amount = 0;

        for(let i = 0; i<balance; i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i)
          const claimed = await tokenContract.tokenIdsClaimed(tokenId);
          if(!claimed) {
            amount++
          }
        }
        setTokensToBeClaimed(BigNumber.from(amount))
      }
    } catch (error) {
      console.error(error)
      setTokensToBeClaimed(zero)
    }
  }

  const getBalanceOfCryptoDevTokens = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);
      const signer = await getProviderOrSigner(true)
      const address = await signer.getAddress()
      const balance = await tokenContract.balanceOf(address)
      setBalanceOfCryptoDevTokens(balance)
    } catch (error) {
      console.error(error)
    }
  }

  const getTotalTokenMinted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (error) {
      console.error(error)
    }
  }

  const mintCryptoDevToken = async (amount) => {
    try {
      const signer = await getProviderOrSigner(true);
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);
      const value = 0.001*amount;
      const tx = await tokenContract.mint(amount, {value: utils.parseEther(value.toString())})
      setLoading(true)
      await tx.wait()
      setLoading(false)
      window.alert("Succesfully minted Crypto Dev Tokens !")
      await getBalanceOfCryptoDevTokens();
      await getTotalTokenMinted();
      await getTokensToBeClaimed();
    } catch (error) {
      console.error(error)
    }
  }

  const claimCryptoDevTokens = async () => {
    try {
      const signer = await getProviderOrSigner(true)
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);
      const tx = await tokenContract.claim()
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("Successfully claimed Crypto Dev Tokens")
    } catch (error) {
      console.error(error)
    }
  }

  const renderButton = () => {
    if(loading) {
      return(
        <div>
          <button className={styles.button}>Loading ...</button>
        </div>
      )
    }

    if(tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}> {tokensToBeClaimed* 10} Tokens can be claimed !</div>
          <button className={styles.button} onClick={claimCryptoDevTokens}>Claim Tokens !</button>
        </div>
      )
    }
    return (
      <div style={{display: "flex-col"}}>
        <div>
          <input type="number" placeholder="Amount of Tokens" onChange={(e) => {
            if (e.target.value !== "") {
                setTokenAmount(BigNumber.from(e.target.value))
            } else {
                setTokenAmount(BigNumber.from(0))  // ou peut-être simplement setTokenAmount(null), selon vos besoins
            }
          }}/>
          <button className={styles.button} disabled={!(tokenAmount > 0)} onClick={() => mintCryptoDevToken(tokenAmount)}>Mint Tokens !</button>
        </div>
        <div>

        </div>
      </div>
    )
  }

  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // call the owner function from the contract
      const _owner = await tokenContract.owner();
      // we get signer to extract address of currently connected Metamask account
      const signer = await getProviderOrSigner(true);
      // Get the address associated to signer which is connected to Metamask
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  
  const withdrawCoins = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );

      const tx = await tokenContract.withdraw();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await getOwner();
    } catch (err) {
      console.error(err);
      window.alert(err.reason);
    }
  };

  useEffect(()=>{
    if(!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "sepolia",
        providerOptions: {},
        disableInjectedProvider: false
      })
      connectWallet()
      getBalanceOfCryptoDevTokens();
      getTotalTokenMinted();
      getTokensToBeClaimed();
      getOwner()
    };
    
  }, [walletConnected])
  return (
    <div className={styles.container}>
      <Head>
        <title>Crypto Devs ICO</title>
        <meta name="description" content="ICO-dApp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}> Welcome to Crypto Devs ICO</h1>
          <div className={styles.description}> You can claim or mint Crypto Dev tokens here</div>
          {walletConnected ? 
          <div>
            <div className={styles.description}>
              You have minted {utils.formatEther(balanceOfCryptoDevTokens)} Crypto Dev Tokens !
            </div>
            <div className={styles.description}>
              Overall {utils.formatEther(tokensMinted)}/10000 have been minted !
            </div>
            {renderButton()}
            {isOwner ? (
                  <div>
                  {loading ? <button className={styles.button}>Loading...</button>
                           : <button className={styles.button} onClick={withdrawCoins}>
                               Withdraw Coins
                             </button>
                  }
                  </div>
                  ) : ("")
                }
          </div>
          :
          <button className={styles.button} onClick={connectWallet}>Connect your wallet</button>}
        </div>
        <div>
          <img className={styles.image} src="/0.svg"/>
        </div>
      </div>
      <footer className={styles.footer}> Made with &#10084; by Crypto Devs</footer>
    </div>
  )
}
